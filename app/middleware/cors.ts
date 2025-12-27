import type { CorsConfig, MiddlewareFactory } from "./types";
import { middlewareRegistry, MiddlewareGroup } from "../core/MiddlewareRegistry";

/**
 * CORS (Cross-Origin Resource Sharing) Middleware Factory
 * Handles CORS headers and preflight requests
 */
export const createCorsMiddleware: MiddlewareFactory<CorsConfig> = (config) => {
  return async (req, res, next) => {
    const requestOrigin = req.header["origin"] || req.header["Origin"];

    // Determine if origin is allowed
    let allowedOrigin: string | undefined;

    if (config.origin === "*") {
      allowedOrigin = "*";
    } else if (typeof config.origin === "string") {
      if (requestOrigin === config.origin) {
        allowedOrigin = config.origin;
      }
    } else if (Array.isArray(config.origin)) {
      if (requestOrigin && config.origin.includes(requestOrigin)) {
        allowedOrigin = requestOrigin;
      }
    }

    // Set CORS headers
    if (allowedOrigin) {
      res.headers["Access-Control-Allow-Origin"] = allowedOrigin;

      if (config.credentials) {
        res.headers["Access-Control-Allow-Credentials"] = "true";
      }

      // Handle preflight request (OPTIONS)
      if (req.method === "OPTIONS") {
        if (config.methods && config.methods.length > 0) {
          res.headers["Access-Control-Allow-Methods"] = config.methods.join(", ");
        } else {
          res.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        }

        if (config.allowedHeaders && config.allowedHeaders.length > 0) {
          res.headers["Access-Control-Allow-Headers"] = config.allowedHeaders.join(", ");
        } else {
          const requestHeaders = req.header["access-control-request-headers"] ||
                                 req.header["Access-Control-Request-Headers"];
          if (requestHeaders) {
            res.headers["Access-Control-Allow-Headers"] = requestHeaders;
          } else {
            res.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
          }
        }

        if (config.maxAge !== undefined) {
          res.headers["Access-Control-Max-Age"] = config.maxAge.toString();
        }

        // Preflight request should return 204 No Content
        res.statusCode = 204;
        res.statusMessage = "No Content";
        res.body = "";

        // Don't call next() for preflight - end here
        return;
      }
    }

    await next();
  };
};

/**
 * Auto-register CORS middleware on module load
 */
middlewareRegistry.register({
  name: "cors",
  description: "Handles CORS (Cross-Origin Resource Sharing) headers and preflight requests",
  version: "1.0.0",
  priority: 20,
  group: MiddlewareGroup.SECURITY,
  factory: createCorsMiddleware,
  defaultConfig: {
    enabled: true,
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400, // 24 hours
  },
  validateConfig: (config: CorsConfig) => {
    const errors: string[] = [];

    if (typeof config.enabled !== "boolean") {
      errors.push("'enabled' must be a boolean");
    }

    if (
      config.origin !== "*" &&
      typeof config.origin !== "string" &&
      !Array.isArray(config.origin)
    ) {
      errors.push("'origin' must be '*', a string, or an array of strings");
    }

    if (Array.isArray(config.origin)) {
      if (config.origin.length === 0) {
        errors.push("'origin' array cannot be empty");
      }
      if (!config.origin.every((o) => typeof o === "string")) {
        errors.push("All 'origin' array elements must be strings");
      }
    }

    if (config.methods !== undefined) {
      if (!Array.isArray(config.methods)) {
        errors.push("'methods' must be an array");
      } else if (!config.methods.every((m) => typeof m === "string")) {
        errors.push("All 'methods' elements must be strings");
      }
    }

    if (config.allowedHeaders !== undefined) {
      if (!Array.isArray(config.allowedHeaders)) {
        errors.push("'allowedHeaders' must be an array");
      } else if (!config.allowedHeaders.every((h) => typeof h === "string")) {
        errors.push("All 'allowedHeaders' elements must be strings");
      }
    }

    if (config.credentials !== undefined && typeof config.credentials !== "boolean") {
      errors.push("'credentials' must be a boolean");
    }

    if (config.maxAge !== undefined) {
      if (typeof config.maxAge !== "number") {
        errors.push("'maxAge' must be a number");
      } else if (config.maxAge < 0) {
        errors.push("'maxAge' must be non-negative");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
