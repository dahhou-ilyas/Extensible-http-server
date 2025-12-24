import { Router } from "./core/router";
import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";
import { MyOwnHttp } from "./main";
import { METHODE } from "./type/type";


const router = new Router();

router.register(METHODE.GET,"/",simpleSuccesForGet)

router.register(METHODE.GET,"/echo/{str}",handleEcho)
router.register(METHODE.GET,"/user-agent",handlerUserAgent)
router.register(METHODE.GET,"/files/{filename}",fileHandler)

router.register(METHODE.POST,"/files/{filename}",saveFile)



const httpServer =new MyOwnHttp(4002,"localhost",router)

httpServer.start();