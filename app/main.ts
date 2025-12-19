import * as net from "net";
import { buildHttpResponse,serializeHttpResponse } from "./builder/ResponseBuilder";

import HttpRequestParser from "./parser/ParseRequestHttp"
import { METHODE, type HttpRequest, type HttpResponse } from "./type/type";
import { Router } from "./core/router";
import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";


const router = new Router();

router.register(METHODE.GET,"/",simpleSuccesForGet)

router.register(METHODE.GET,"/echo/{str}",handleEcho)
router.register(METHODE.GET,"/user-agent",handlerUserAgent)
router.register(METHODE.GET,"/files/{filename}",fileHandler)

router.register(METHODE.POST,"/files/{filename}",saveFile)

const server = net.createServer(async (socket : net.Socket) => {

  let buffer = Buffer.alloc(0); 
  
  socket.on("data",async (chunk:Buffer)=>{
    buffer = Buffer.concat([buffer, chunk]);

    const parser = new HttpRequestParser(buffer);

    const response:HttpResponse = {
      statusCode: 200,
      statusMessage: "",
      headers: {},
      body: ""
    }

    let request: HttpRequest | null;

    try{
      request = parser.parseRequestHttp();
    }catch{
      socket.write(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<h1>Bad Request your request not folow the standard of HTTP</h1>"
      );
      socket.end();
      buffer = Buffer.from([]);
      return;
    }

    if(!request){
      socket.write(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<h1>Bad Request</h1>"
      );
      socket.end();
      buffer = Buffer.from([]);
      return;
    }

    await router.handle(request,response);


    const serializeHttp = serializeHttpResponse(buildHttpResponse(response))

    socket.write(serializeHttp);
    socket.end();

  })
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");

