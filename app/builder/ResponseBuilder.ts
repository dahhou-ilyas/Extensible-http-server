import { brotliCompressSync, deflateSync, gzipSync } from "node:zlib";
import type { HttpRequest, HttpResponse, HttpResponseBuffer } from "../type/type";
import { HttpParsingError, UnsupportedContentEncodingError } from "../exceptions/exceptions";


const STATUS_MESSAGES: Record<number, string> = {
  200: "OK",
  201: "Created",
  301: "Moved Permanently",
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error",
  405:"Method Not Allowed",
};

export function buildHttpResponse(resp : HttpResponse,req:HttpRequest): HttpResponseBuffer {
  const statusMessage = STATUS_MESSAGES[resp?.statusCode] || "Unknown";

  const acceptEncoding = req.header["accept-encoding"];

  let bufferBody: Buffer = Buffer.from(resp?.body, "utf8");

  let selectedEncoding: string | null = null;
  if(acceptEncoding){
    const supportedEncodings = ['gzip', 'deflate', 'br'];
    const requestedEncodings = acceptEncoding.split(',').map(e => e.trim().toLowerCase());

    for(const encoding of requestedEncodings){
      if(supportedEncodings.includes(encoding)){
        selectedEncoding = encoding;
        break;
      }
    }
  }

  if(selectedEncoding){
    bufferBody = compress(bufferBody, selectedEncoding);
    resp.headers["Content-Encoding"] = selectedEncoding;
  }

  resp.headers["Content-Type"] = resp.headers["Content-Type"] || "text/plain";
  resp.headers["Content-Length"] = Buffer.byteLength(bufferBody).toString();


  const closingConnexion = req.header["connection"];

  if(closingConnexion && closingConnexion.toLocaleLowerCase()=="close"){
    resp.headers["Connection"]="close";
  }

  return { statusCode:resp?.statusCode, statusMessage, headers:resp?.headers, body:bufferBody};
}



export function serializeHttpResponse(
  response: HttpResponseBuffer,
  version: string = "HTTP/1.1"
): Buffer {
  const headerLines = Object.entries(response.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");

  const statusLine = `${version} ${response.statusCode} ${response.statusMessage}\r\n`;
  const headers = `${headerLines}\r\n\r\n`;

  const headerBuffer = Buffer.from(statusLine + headers, "utf8");

  return Buffer.concat([headerBuffer, response.body]);
}


function compress(bodyBuffer: Buffer, enc: string): Buffer {
  if (!enc || enc === "identity") return bodyBuffer;

  try {
    switch (enc.toLowerCase()) {
      case "gzip":
        return gzipSync(bodyBuffer);
      case "deflate":
        return deflateSync(bodyBuffer);
      case "br":
        return brotliCompressSync(bodyBuffer);
      default:
        throw new UnsupportedContentEncodingError(enc);
    }
  } catch (e) {
    throw new HttpParsingError(`Failed to compress body with '${enc}'`);
  }
}