import type { LoggerConfig, MiddlewareFactory } from "./types";

export const createLoggerMiddleware: MiddlewareFactory<LoggerConfig> = (config)=>{
    return async (req, res, next) => {
        const timestamp = new Date().toISOString();
        const {method,url} = req
        const {statusCode}=res
        const startTime = Date.now();
        console.log(`[${timestamp}] ${method} ${url}`); // Log request

        await next();

        const duration = Date.now() - startTime;
        console.log(`[${timestamp}] ${statusCode} ${method} ${url} ${duration}ms`);
    };
}