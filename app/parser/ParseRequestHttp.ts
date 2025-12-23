import {METHODE, type HttpRequest} from "../type/type"
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import {isJsonObject} from "../utils/utils"
import { HttpParsingError, IncompleteHttpHeadersError, InvalidJsonBodyError, UnsupportedContentEncodingError } from "../exceptions/exceptions";

export default class HttpRequestParser {
    constructor(readonly requestBuffer: Buffer) {}

    public parseRequestHttp() : HttpRequest | null {

        const delimiter = Buffer.from("\r\n\r\n");


        const headerEndIndex = this.requestBuffer.indexOf(delimiter);

        if (headerEndIndex === -1) {
          throw new IncompleteHttpHeadersError();
        }

        const headerBuffer = this.requestBuffer.slice(0, headerEndIndex);

        const headerString = headerBuffer.toString("utf8");

        const headerLines = headerString.split(/\r?\n/);

        if (!headerLines[0]) return null;


        const {method,url,version}=this.parseRequestLine(headerLines[0]);



        const header = this.parseRequestHeader(headerLines);


        const remainingBuffer = this.requestBuffer.subarray(headerEndIndex + delimiter.length);


        this.verifyBodyCompleteness(header, remainingBuffer, method);

        let Body = "";

        if (method==METHODE.POST.toString() || method==METHODE.DELETE.toString() || method==METHODE.PUT.toString()){
            const bodyBuffer = this.extractBodyOnly(header, remainingBuffer);
            Body = this.parseRequestBody(header, bodyBuffer);
        }

        return {method,url,version,header,Body}

    }


    private verifyBodyCompleteness(header: Record<string, string>, bodyBuffer: Buffer, method: string): void {
        // Pas de body pour GET, HEAD, OPTIONS
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return;
        }

        // Cas 1: Transfer-Encoding: chunked
        if (header["transfer-encoding"]?.toLowerCase().includes("chunked")) {
            if (!this.isChunkedBodyComplete(bodyBuffer)) {
                throw new HttpParsingError("Incomplete chunked body");
            }
            return;
        }

        // Cas 2: Content-Length
        if (header["content-length"]) {
            const contentLength = parseInt(header["content-length"], 10);
            if (bodyBuffer.length < contentLength) {
                throw new HttpParsingError(`Incomplete body: expected ${contentLength} bytes, got ${bodyBuffer.length}`);
            }
        }
    }


    private isChunkedBodyComplete(bodyBuffer: Buffer): boolean {
        let offset = 0;

        while (offset < bodyBuffer.length) {
            const crlfIndex = bodyBuffer.indexOf('\r\n', offset);
            
            if (crlfIndex === -1) {
                return false; // Ligne de taille incomplète
            }

            const sizeStr = bodyBuffer.slice(offset, crlfIndex).toString('utf8').trim();
            const chunkSize = parseInt(sizeStr.split(';')[0], 16);

            if (isNaN(chunkSize)) {
                return false;
            }

            if (chunkSize === 0) {
                const expectedEnd = crlfIndex + 4;
                return bodyBuffer.length >= expectedEnd;
            }

            const dataStart = crlfIndex + 2;
            const dataEnd = dataStart + chunkSize;
            const nextChunkStart = dataEnd + 2;

            if (bodyBuffer.length < nextChunkStart) {
                return false;
            }

            offset = nextChunkStart;
        }

        return false;
    }

    private parseRequestLine(line : string) : {method:string,url:string,version:string}{
        const [method="",url="",version=""]=line.split(" ");

        if(!method || !url || !version){
            throw new HttpParsingError("incomplete Request Line")
        }

        return {method,url,version}
    }


    private parseRequestHeader(lines : string[]){

        const result: { [key: string]: string } ={}

        for (let i=1;i<lines.length;i++){
            const line = lines[i].trim();
            if (!line) continue; 

            const idx = line.indexOf(":");
            if (idx === -1) throw new HttpParsingError(`Incomplete header at line ${i+1}`);


            const key = line.slice(0, idx).trim().toLowerCase();
            const value = line.slice(idx + 1).trim();

            if (!key || !value) throw new HttpParsingError(`Incomplete header at line ${i+1}`);

            result[key] = value;
        }

        return result
    }


    
    private extractBodyOnly(header: Record<string, string>, remainingBuffer: Buffer): Buffer {
        // Cas 1: Transfer-Encoding: chunked
        if (header["transfer-encoding"]?.toLowerCase().includes("chunked")) {
            const endMarker = Buffer.from("0\r\n\r\n");
            const endIndex = remainingBuffer.indexOf(endMarker);
            if (endIndex === -1) {
                throw new HttpParsingError("Incomplete chunked body");
            }
            return remainingBuffer.subarray(0, endIndex + endMarker.length);
        }

        if (header["content-length"]) {
            const contentLength = parseInt(header["content-length"], 10);
            return remainingBuffer.subarray(0, contentLength);
        }

        //Pas de body (GET, HEAD, etc.)
        return Buffer.alloc(0);
    }

    private parseRequestBody(header : Record<string,string> , bodyBuffer:Buffer){
        // Si Transfer-Encoding: chunked, décoder les chunks d'abord
        if (header["transfer-encoding"]?.toLowerCase().includes("chunked")) {
            bodyBuffer = this.parseChunkedBody(bodyBuffer);
        }

        // 1 Décompresser (si Content-Encoding existe) si existe si non le body ne pas compresser

        const decompressedBodyBuffer = this.decompresseBody(header, bodyBuffer);

        // 2 Décoder les bytes → texte (si nécessaire) par defailt utf-8

        // 3 Parsing (JSON, form, etc.) Content-Type ===> application/json → JSON.parse(text)  application/x-www-form-urlencoded → parse clé/valeur  multipart/form-data → parser boundaries

        const bodyFormater = this.formateBody(decompressedBodyBuffer, header);

        return bodyFormater;
    }

    private decompresseBody(header : Record<string,string> , bodyBuffer:Buffer){
        const compressAlgo=header["content-encoding"] ? header["content-encoding"].split(",").map(e => e.trim()).reverse() : [];

        for (const enc of compressAlgo) {
            bodyBuffer = this.decompress(bodyBuffer, enc);
        }
        return bodyBuffer;
    }

    private decompress(bodyBuffer:Buffer, enc:string){
        if (!enc || enc === "identity") return bodyBuffer;

        try {
            switch (enc.toLowerCase()) {
              case "gzip":
                return gunzipSync(bodyBuffer);
              case "deflate":
                return inflateSync(bodyBuffer);
              case "br":
                return brotliDecompressSync(bodyBuffer);
              default:
                throw new UnsupportedContentEncodingError(enc);
            }
        }catch (e) {
          throw new HttpParsingError(`Failed to decompress body with '${enc}'`);
        }
        
    }

    private formateBody(bodyBuffer:Buffer, header:Record<string,string>){
        let contentType =  header["content-type"];
        contentType = contentType ? contentType.toLocaleLowerCase() : "";

        //const simpleText = ["text/plain","text/html","text/css","text/javascript"];
        const text = bodyBuffer.toString("utf8");

        if(contentType == "application/json"){
            if(!isJsonObject(text)){
                throw new InvalidJsonBodyError("NOT A valide json in body request")
            }
            const json = JSON.parse(text);
            return json   
        }

        return text;
    }


    private parseChunkedBody(bodyBuffer: Buffer): Buffer{
        const chunks: Buffer[] = [];

        let offset = 0;

        while (offset < bodyBuffer.length){
            const crlfIndex = bodyBuffer.indexOf('\r\n', offset);

            if (crlfIndex === -1) {
                throw new HttpParsingError('Chunked encoding: chunk size line not terminated');
            }

            const sizeStr = bodyBuffer.slice(offset, crlfIndex).toString('utf8').trim();


            const chunkSize = parseInt(sizeStr, 16);

            if (isNaN(chunkSize)) {
              throw new HttpParsingError(`Invalid chunk size: ${sizeStr}`);
            }

            if (chunkSize === 0) {
              break;
            }

            const dataStart = crlfIndex + 2;
            const dataEnd = dataStart + chunkSize;

            if (dataEnd > bodyBuffer.length) {
              throw new HttpParsingError('Incomplete chunked body');
            }

            chunks.push(bodyBuffer.slice(dataStart, dataEnd));

            offset = dataEnd + 2;
        }

        return Buffer.concat(chunks);
    }
}



