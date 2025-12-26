import type { MiddlewareConfiguration } from "../middleware/types";

export const middlewareConfig: MiddlewareConfiguration = {
    logger: {
        enabled: true,
        colorize: true,
        logRequestHeaders: false,
        logRequestBody: false,
    },
}