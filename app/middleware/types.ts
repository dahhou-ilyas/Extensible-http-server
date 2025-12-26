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


export type MiddlewareConfiguration = {
  logger: LoggerConfig;
};