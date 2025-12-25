import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";
import { MyOwnHttp } from "./main";
import { METHODE } from "./type/type";


const httpServer =new MyOwnHttp(4002,"localhost")

httpServer.registerRoute(METHODE.GET,"/",simpleSuccesForGet)

httpServer.registerRoute(METHODE.GET,"/echo/{str}",handleEcho)
httpServer.registerRoute(METHODE.GET,"/user-agent",handlerUserAgent)
httpServer.registerRoute(METHODE.GET,"/files/{filename}",fileHandler)

httpServer.registerRoute(METHODE.POST,"/files/{filename}",saveFile)

httpServer.start();