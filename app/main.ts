import * as net from "net";
import { buildHttpResponse,serializeHttpResponse } from "./builder/ResponseBuilder";

import HttpRequestParser from "./parser/ParseRequestHttp"
import { METHODE, type HttpRequest, type HttpResponse } from "./type/type";
import { Router } from "./core/router";
import { fileHandler, handleEcho, handlerUserAgent, saveFile, simpleSuccesForGet } from "./handler/handler";
import { IncompleteHttpHeadersError } from "./exceptions/exceptions";
const KEEP_ALIVE_TIMEOUT = 5000;

const router = new Router();

router.register(METHODE.GET,"/",simpleSuccesForGet)

router.register(METHODE.GET,"/echo/{str}",handleEcho)
router.register(METHODE.GET,"/user-agent",handlerUserAgent)
router.register(METHODE.GET,"/files/{filename}",fileHandler)

router.register(METHODE.POST,"/files/{filename}",saveFile)

/**
 * FONCTIONNEMENT DU CHUNKED ENCODING ET DES CHUNKS TCP DANS NOTRE SERVEUR HTTP
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Lorsqu'une nouvelle connexion TCP est établie, la callback net.createServer() 
 * est exécutée UNE SEULE FOIS par client, créant un contexte persistant avec 
 * des variables (comme le buffer) qui survivent entre les événements. 
 * 
 * L'événement socket.on("data") est déclenché À CHAQUE FOIS que des données 
 * arrivent sur le socket TCP. Pour une même requête HTTP, cet événement peut 
 * être appelé PLUSIEURS FOIS car TCP fragmente les données selon la taille 
 * du buffer réseau, la congestion, ou le MTU. De plus, si le client utilise 
 * Transfer-Encoding: chunked, il envoie délibérément le body en plusieurs 
 * morceaux espacés dans le temps (streaming).
 * 
 * À chaque déclenchement de socket.on("data"), nous accumulons les nouvelles 
 * données dans notre buffer persistant avec Buffer.concat(), puis nous 
 * vérifions si la requête HTTP est complète. Si elle est incomplète (headers 
 * partiels ou body chunked non terminé par "0\r\n\r\n"), nous faisons un 
 * return qui sort UNIQUEMENT de la fonction callback actuelle SANS fermer 
 * la connexion. Le socket reste ouvert, le buffer conserve toutes les données 
 * accumulées, et le serveur attend passivement le prochain chunk TCP.
 * 
 * Quand un nouveau chunk arrive, socket.on("data") est rappelé, les nouvelles 
 * données sont ajoutées au buffer existant, et nous revérifions la complétude. 
 * Ce cycle continue jusqu'à ce que nous détections une requête complète 
 * (headers complets + body entier pour Content-Length, ou "0\r\n\r\n" final 
 * pour chunked encoding). C'est seulement à ce moment que nous pouvons parser 
 * et traiter la requête dans son intégralité.
 * 
 * Cette approche permet de gérer élégamment les deux types de fragmentation : 
 * la fragmentation TCP involontaire (réseau) et le chunked encoding HTTP 
 * volontaire (streaming), tout en maintenant une connexion stable avec le client.
 */

const server = net.createServer(async (socket : net.Socket) => {
  let buffer = Buffer.alloc(0);
  
  socket.setTimeout(KEEP_ALIVE_TIMEOUT);

  socket.on("data", async (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);

    
    const parser = new HttpRequestParser(buffer);
    
    const response: HttpResponse = {
      statusCode: 200,
      statusMessage: "",
      headers: {},
      body: ""
    };

    let request: HttpRequest | null;

    try {
      request = parser.parseRequestHttp();
      
    } catch (error) {
      if (error instanceof IncompleteHttpHeadersError) {
        return;
      }
      
      if (error instanceof Error && error.message.includes("Incomplete chunked body")) {
        return;
      }
      
      socket.write(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<h1>Bad Request: Invalid HTTP format</h1>"
      );
      socket.end();
      buffer = Buffer.alloc(0);
      return;
    }

    if (!request) {
      socket.write(
        "HTTP/1.1 400 Bad Request\r\nContent-Type: text/html\r\n\r\n<h1>Bad Request</h1>"
      );
      socket.end();
      buffer = Buffer.alloc(0);
      return;
    }

    await router.handle(request, response);

    const serializeHttp = serializeHttpResponse(buildHttpResponse(response, request));
    socket.write(serializeHttp);

    buffer = sliceCurrentRequest(buffer,request);

    const connectionHeader = request.header["connection"];

    if (connectionHeader && connectionHeader.toLowerCase() === "close") {
      socket.end();
    }

    socket.setTimeout(KEEP_ALIVE_TIMEOUT);

  });

  socket.on("timeout", () => {
    console.log("[SERVER] Socket idle timeout, closing connection");
    socket.end();
  });

  socket.on("error", (err) => {
    console.error("[SERVER] Socket error:", err);
    socket.destroy();
  });
});


function sliceCurrentRequest(buffer:Buffer,request : HttpRequest){

  if (request.header["transfer-encoding"]?.toLowerCase().includes("chunked")) {
    const delimiterBody = Buffer.from("0\r\n\r\n");
    const indexBuffer = buffer.indexOf(delimiterBody);
    return buffer.slice(indexBuffer + delimiterBody.length); // + 5
  }

  
  const delimiter = Buffer.from("\r\n\r\n");
  const headerEndIndex = buffer.indexOf(delimiter) + delimiter.length;

  const cl = request.header["content-length"];
  
  if (cl) {
    const contentLength = parseInt(cl, 10);
    return buffer.slice(headerEndIndex + contentLength); // + 4
  }
  
  

  return buffer.slice(headerEndIndex);

}

server.listen(4221, "localhost");

