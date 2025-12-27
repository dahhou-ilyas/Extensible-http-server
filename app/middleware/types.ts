import type { HttpRequest, HttpResponse, NextFunction } from "../type/type";

export interface MiddlewareConfig {
  enabled: boolean;
}


export interface LoggerConfig extends MiddlewareConfig {
  logRequestHeaders?: boolean;
  logRequestBody?: boolean;
  logResponseHeaders?: boolean;
  logResponseBody?: boolean;
  colorize?: boolean;
}


export interface CorsConfig extends MiddlewareConfig {
  origin: string | string[] | "*";
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}


export interface RateLimitConfig extends MiddlewareConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: HttpRequest) => string;
}


export interface AuthConfig extends MiddlewareConfig {
  type: "basic" | "bearer" | "custom";
  realm?: string;
  users?: Record<string, string>;
  validateToken?: (token: string) => boolean | Promise<boolean>;
}


export type MiddlewareFactory<T extends MiddlewareConfig> = (
  config: T
) => (req: HttpRequest, res: HttpResponse, next: NextFunction) => void | Promise<void>;


/**
 * Enhanced middleware configuration with priority and group support
 */
export interface MiddlewareConfigEntry<T extends MiddlewareConfig = MiddlewareConfig> {
  enabled: boolean;
  priority?: number;
  options: Omit<T, 'enabled'>;
}

/**
 * Global middleware system configuration
 */
export interface GlobalMiddlewareConfig {
  /** Error handling strategy: 'continue' continues chain on error, 'stop' breaks the chain */
  errorHandling?: 'continue' | 'stop';
  /** Enable performance monitoring for middlewares */
  performanceMonitoring?: boolean;
  /** Maximum time a middleware can take before warning (ms) */
  maxExecutionTimeMs?: number;
}

/**
 * Extensible middleware configuration
 * Add new middlewares here without breaking existing code
 */
export interface MiddlewareConfiguration {
  /** Global configuration for all middlewares */
  global?: GlobalMiddlewareConfig;

  /** Individual middleware configurations */
  middlewares: {
    logger?: MiddlewareConfigEntry<LoggerConfig>;
    cors?: MiddlewareConfigEntry<CorsConfig>;
    rateLimit?: MiddlewareConfigEntry<RateLimitConfig>;
    auth?: MiddlewareConfigEntry<AuthConfig>;
    // Add new middlewares here as needed
    [key: string]: MiddlewareConfigEntry<any> | undefined;
  };
}

/**
 * Legacy configuration for backward compatibility
 * @deprecated Use the new MiddlewareConfiguration structure instead
 */
export type LegacyMiddlewareConfiguration = {
  logger: LoggerConfig;
};