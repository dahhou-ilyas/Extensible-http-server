import type { LoggerConfig, MiddlewareFactory } from "./types";


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
      console.log("  📥 Request Headers:", JSON.stringify(req.header, null, 2));
    }

    if (config.logRequestBody && req.Body) {
      console.log("  📦 Request Body:", req.Body);
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
      console.log("  📤 Response Headers:", JSON.stringify(res.headers, null, 2));
    }

    if (config.logResponseBody && res.body) {
      const bodyPreview = res.body.substring(0, 200);
      const truncated = res.body.length > 200 ? "..." : "";
      console.log(`  📄 Response Body: ${bodyPreview}${truncated}`);
    }
  };
};