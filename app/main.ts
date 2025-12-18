import * as net from "net";


const server = net.createServer((socket : net.Socket) => {
  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");

