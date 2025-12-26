import type { MiddlewareConfiguration } from "../middleware/types";

export const middlewareConfig: MiddlewareConfiguration = {
    logger: {
      enabled: true,
      colorize: true,
      logRequestHeaders: true,
      logRequestBody: true,
      logResponseHeaders: true,
      logResponseBody: true,
    }
}