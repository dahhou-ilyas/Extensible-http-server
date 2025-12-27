import type { AuthConfig, MiddlewareFactory } from "./types";
import { middlewareRegistry, MiddlewareGroup } from "../core/MiddlewareRegistry";

/**
 * Extract authorization token from request headers
 */
function extractAuthToken(authHeader: string | undefined): {
  type: "basic" | "bearer" | null;
  credentials: string | null;
} {
  if (!authHeader) {
    return { type: null, credentials: null };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    return { type: null, credentials: null };
  }

  const scheme = parts[0].toLowerCase();
  const credentials = parts[1];

  if (scheme === "basic") {
    return { type: "basic", credentials };
  } else if (scheme === "bearer") {
    return { type: "bearer", credentials };
  }

  return { type: null, credentials: null };
}

/**
 * Validate basic authentication credentials
 */
function validateBasicAuth(
  credentials: string,
  users: Record<string, string>
): boolean {
  try {
    const decoded = Buffer.from(credentials, "base64").toString("utf-8");
    const [username, password] = decoded.split(":");

    if (!username || !password) {
      return false;
    }

    return users[username] === password;
  } catch (error) {
    return false;
  }
}

/**
 * Authentication Middleware Factory
 * Supports Basic, Bearer, and custom authentication
 */
export const createAuthMiddleware: MiddlewareFactory<AuthConfig> = (config) => {
  return async (req, res, next) => {
    const authHeader = req.header["authorization"] || req.header["Authorization"];
    const { type, credentials } = extractAuthToken(authHeader);

    let authenticated = false;

    // Handle different auth types
    if (config.type === "basic") {
      if (type === "basic" && credentials && config.users) {
        authenticated = validateBasicAuth(credentials, config.users);
      }
    } else if (config.type === "bearer") {
      if (type === "bearer" && credentials && config.validateToken) {
        try {
          const result = config.validateToken(credentials);
          authenticated = result instanceof Promise ? await result : result;
        } catch (error) {
          console.error("Bearer token validation error:", error);
          authenticated = false;
        }
      }
    } else if (config.type === "custom") {
      if (config.validateToken && authHeader) {
        try {
          const result = config.validateToken(authHeader);
          authenticated = result instanceof Promise ? await result : result;
        } catch (error) {
          console.error("Custom auth validation error:", error);
          authenticated = false;
        }
      }
    }

    if (!authenticated) {
      // Set WWW-Authenticate header
      if (config.type === "basic") {
        const realm = config.realm || "Protected";
        res.headers["WWW-Authenticate"] = `Basic realm="${realm}"`;
      } else if (config.type === "bearer") {
        res.headers["WWW-Authenticate"] = 'Bearer realm="Protected"';
      }

      res.statusCode = 401;
      res.statusMessage = "Unauthorized";
      res.body = JSON.stringify({
        error: "Unauthorized",
        message: "Authentication required",
      });

      // Don't call next() - authentication failed
      return;
    }

    // Authentication successful, continue to next middleware
    await next();
  };
};

/**
 * Auto-register authentication middleware on module load
 */
middlewareRegistry.register({
  name: "auth",
  description: "Authentication middleware supporting Basic, Bearer, and custom auth",
  version: "1.0.0",
  priority: 40,
  group: MiddlewareGroup.AUTH,
  factory: createAuthMiddleware,
  defaultConfig: {
    enabled: true,
    type: "bearer",
    realm: "Protected",
  },
  validateConfig: (config: AuthConfig) => {
    const errors: string[] = [];

    if (typeof config.enabled !== "boolean") {
      errors.push("'enabled' must be a boolean");
    }

    if (!["basic", "bearer", "custom"].includes(config.type)) {
      errors.push("'type' must be 'basic', 'bearer', or 'custom'");
    }

    if (config.type === "basic") {
      if (!config.users || typeof config.users !== "object") {
        errors.push("'users' object is required for basic auth");
      }
    }

    if (config.type === "bearer" || config.type === "custom") {
      if (!config.validateToken || typeof config.validateToken !== "function") {
        errors.push("'validateToken' function is required for bearer/custom auth");
      }
    }

    if (config.realm !== undefined && typeof config.realm !== "string") {
      errors.push("'realm' must be a string");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
