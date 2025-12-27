import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";
import { MyOwnHttp } from "./main";
import { METHODE } from "./type/type";
import { middlewareConfig } from "./config/middleware.config";
import { MiddlewareLoader } from "./core/middlewareLoader";

// Import all middlewares to auto-register them in the registry
// Each middleware file registers itself on import via middlewareRegistry.register()
import "./middleware/logger";
import "./middleware/cors";
import "./middleware/rateLimit";
import "./middleware/auth";

const httpServer = new MyOwnHttp(4002, "localhost");

MiddlewareLoader.registerMiddlewares(httpServer, middlewareConfig);

httpServer.registerRoute(METHODE.GET,"/",simpleSuccesForGet)

httpServer.registerRoute(METHODE.GET,"/echo/{str}",handleEcho)
httpServer.registerRoute(METHODE.GET,"/user-agent",handlerUserAgent)
httpServer.registerRoute(METHODE.GET,"/files/{filename}",fileHandler)

httpServer.registerRoute(METHODE.POST,"/files/{filename}",saveFile)

httpServer.start();