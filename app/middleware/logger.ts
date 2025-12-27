import type { LoggerConfig, MiddlewareFactory } from "./types";
import { middlewareRegistry, MiddlewareGroup } from "../core/MiddlewareRegistry";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

/**
 * Logger Middleware Factory
 * Logs HTTP requests and responses with colorization and detailed information
 */
export const createLoggerMiddleware: MiddlewareFactory<LoggerConfig> = (config) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const { method, url } = req;

    if (config.colorize) {
      console.log(
        `${colors.dim}[${timestamp}]${colors.reset} ` +
        `${colors.cyan}${method}${colors.reset} ` +
        `${colors.bright}${url}${colors.reset}`
      );
    } else {
      console.log(`[${timestamp}] ${method} ${url}`);
    }

    if (config.logRequestHeaders) {
      console.log("  Request Headers:", JSON.stringify(req.header, null, 2));
    }

    if (config.logRequestBody && req.Body) {
      console.log("  Request Body:", req.Body);
    }

    await next();

    const duration = Date.now() - startTime;
    const statusCode = res.statusCode; 

    
    let statusColor = colors.reset;
    if (config.colorize) {
      if (statusCode >= 500) statusColor = colors.red;
      else if (statusCode >= 400) statusColor = colors.yellow;
      else if (statusCode >= 300) statusColor = colors.magenta;
      else if (statusCode >= 200) statusColor = colors.green;
    }

    if (config.colorize) {
      console.log(
        `${colors.dim}[${timestamp}]${colors.reset} ` +
        `${statusColor}${statusCode}${colors.reset} ` +
        `${colors.cyan}${method}${colors.reset} ` +
        `${url} ` +
        `${colors.dim}${duration}ms${colors.reset}`
      );
    } else {
      console.log(`[${timestamp}] ${statusCode} ${method} ${url} ${duration}ms`);
    }

    if (config.logResponseHeaders) {
      console.log(" Response Headers:", JSON.stringify(res.headers, null, 2));
    }

    if (config.logResponseBody && res.body) {
      const bodyPreview = res.body.substring(0, 200);
      const truncated = res.body.length > 200 ? "..." : "";
      console.log(`  📄 Response Body: ${bodyPreview}${truncated}`);
    }
  };
};

/**
 * Auto-register logger middleware on module load
 */
middlewareRegistry.register({
  name: "logger",
  description: "Logs HTTP requests and responses with detailed information",
  version: "1.0.0",
  priority: 10,
  group: MiddlewareGroup.MONITORING,
  factory: createLoggerMiddleware,
  defaultConfig: {
    enabled: true,
    colorize: true,
    logRequestHeaders: false,
    logRequestBody: false,
    logResponseHeaders: false,
    logResponseBody: false,
  },
  validateConfig: (config: LoggerConfig) => {
    const errors: string[] = [];

    if (typeof config.enabled !== "boolean") {
      errors.push("'enabled' must be a boolean");
    }

    if (config.colorize !== undefined && typeof config.colorize !== "boolean") {
      errors.push("'colorize' must be a boolean");
    }

    if (config.logRequestHeaders !== undefined && typeof config.logRequestHeaders !== "boolean") {
      errors.push("'logRequestHeaders' must be a boolean");
    }

    if (config.logRequestBody !== undefined && typeof config.logRequestBody !== "boolean") {
      errors.push("'logRequestBody' must be a boolean");
    }

    if (config.logResponseHeaders !== undefined && typeof config.logResponseHeaders !== "boolean") {
      errors.push("'logResponseHeaders' must be a boolean");
    }

    if (config.logResponseBody !== undefined && typeof config.logResponseBody !== "boolean") {
      errors.push("'logResponseBody' must be a boolean");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});