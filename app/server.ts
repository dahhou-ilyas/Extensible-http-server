import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";
import { MyOwnHttp } from "./main";
import { createLoggerMiddleware } from "./middleware/logger";
import type { LoggerConfig } from "./middleware/types";
import { METHODE } from "./type/type";
import { middlewareConfig } from "./config/middleware.config";



const httpServer =new MyOwnHttp(4002,"localhost")

if (middlewareConfig.logger.enabled) {
  const loggerMiddleware = createLoggerMiddleware(middlewareConfig.logger);
  httpServer.registerMiddl(loggerMiddleware);
}
httpServer.registerRoute(METHODE.GET,"/",simpleSuccesForGet)

httpServer.registerRoute(METHODE.GET,"/echo/{str}",handleEcho)
httpServer.registerRoute(METHODE.GET,"/user-agent",handlerUserAgent)
httpServer.registerRoute(METHODE.GET,"/files/{filename}",fileHandler)

httpServer.registerRoute(METHODE.POST,"/files/{filename}",saveFile)

httpServer.start();