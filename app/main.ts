import * as net from "net";
import { buildHttpResponse,serializeHttpResponse } from "./builder/ResponseBuilder";


const server = net.createServer((socket : net.Socket) => {

  socket.on("data",(data)=>{
    const response = serializeHttpResponse(buildHttpResponse(200,""))
    socket.write(response);
    socket.end()
  })
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");

