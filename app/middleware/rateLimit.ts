import type { RateLimitConfig, MiddlewareFactory } from "./types";
import { middlewareRegistry, MiddlewareGroup } from "../core/MiddlewareRegistry";
import { globalRateLimitStore } from "./utils/rateLimitStore";


const defaultKeyGenerator = (req: any): string => {
  // Try to get IP from common headers first
  const forwardedFor = req.header["x-forwarded-for"] || req.header["X-Forwarded-For"];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.header["x-real-ip"] || req.header["X-Real-IP"];
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic key if we can't determine IP
  // In production, you might want to extract from req.url or other identifiers
  return "unknown-client";
};

/**
 * Rate Limiting Middleware Factory
 * Implements sliding window rate limiting with configurable limits
 */
export const createRateLimitMiddleware: MiddlewareFactory<RateLimitConfig> = (config) => {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const message = config.message || "Too many requests, please try again later.";

  return async (req, res, next) => {
    const key = keyGenerator(req);
    const result = globalRateLimitStore.increment(key, config.windowMs, config.maxRequests);

    // Set rate limit headers (standard headers)
    res.headers["X-RateLimit-Limit"] = config.maxRequests.toString();
    res.headers["X-RateLimit-Remaining"] = Math.max(
      0,
      config.maxRequests - result.count
    ).toString();
    res.headers["X-RateLimit-Reset"] = Math.ceil(result.resetTime / 1000).toString();

    if (result.exceeded) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.headers["Retry-After"] = retryAfter.toString();

      res.statusCode = 429;
      res.statusMessage = "Too Many Requests";
      res.body = JSON.stringify({
        error: "Too Many Requests",
        message,
        retryAfter: retryAfter,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });

      // Don't call next() - stop the chain
      return;
    }

    // Within limits, continue to next middleware
    await next();
  };
};

/**
 * Auto-register rate limit middleware on module load
 */
middlewareRegistry.register({
  name: "rateLimit",
  description: "Rate limiting middleware using sliding window algorithm",
  version: "1.0.0",
  priority: 30,
  group: MiddlewareGroup.RATE_LIMITING,
  factory: createRateLimitMiddleware,
  defaultConfig: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: "Too many requests, please try again later.",
  },
  validateConfig: (config: RateLimitConfig) => {
    const errors: string[] = [];

    if (typeof config.enabled !== "boolean") {
      errors.push("'enabled' must be a boolean");
    }

    if (typeof config.windowMs !== "number") {
      errors.push("'windowMs' must be a number");
    } else if (config.windowMs <= 0) {
      errors.push("'windowMs' must be positive");
    }

    if (typeof config.maxRequests !== "number") {
      errors.push("'maxRequests' must be a number");
    } else if (config.maxRequests <= 0) {
      errors.push("'maxRequests' must be positive");
    } else if (!Number.isInteger(config.maxRequests)) {
      errors.push("'maxRequests' must be an integer");
    }

    if (config.message !== undefined && typeof config.message !== "string") {
      errors.push("'message' must be a string");
    }

    if (config.keyGenerator !== undefined && typeof config.keyGenerator !== "function") {
      errors.push("'keyGenerator' must be a function");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
