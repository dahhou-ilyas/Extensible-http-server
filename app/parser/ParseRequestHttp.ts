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


        const bodyBuffer = this.requestBuffer.slice(headerEndIndex + delimiter.length);

        let Body = "";

        if (bodyBuffer && (method==METHODE.POST.toString() || method==METHODE.DELETE.toString() || method==METHODE.PUT.toString())){
            Body = this.parseRequestBody(header,bodyBuffer)
        }

        return {method,url,version,header,Body}

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


    private parseRequestBody(header : Record<string,string> , bodyBuffer:Buffer){
        //TODO 

        // 1 Décompresser (si Content-Encoding existe) si existe si non le body ne pas compresser 

        const decompresseBodyBuffer = this.decompresseBody(header,bodyBuffer)
        
        // 2 Décoder les bytes → texte (si nécessaire) par defailt utf-8

        // 3 Parsing (JSON, form, etc.) Content-Type ===> application/json → JSON.parse(text)  application/x-www-form-urlencoded → parse clé/valeur  multipart/form-data → parser boundaries

        const bodyFormater = this.formateBody(decompresseBodyBuffer,header)


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
}



