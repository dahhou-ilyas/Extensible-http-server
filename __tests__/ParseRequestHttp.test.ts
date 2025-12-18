import { InvalidJsonBodyError } from "../app/exceptions/exceptions";
import HttpRequestParser from "../app/parser/ParseRequestHttp";


describe("UNIT TEST for HTTP PARSER REQUEST",()=>{

    it('Requête GET simple', () => {

        const simpleGet = `GET /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl/7.68.0\r\n\r\n
        `;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)

        const result=httpParserRes.parseRequestHttp();

        expect(result).not.toBeNull();

        if(result){
            const {method,url,version,header,Body} = result

            expect(result.method).toBe('GET');
            expect(result.url).toBe('/index.html');
            expect(result.version).toBe('HTTP/1.1');
            expect(result.header['host']).toBe('example.com');
            expect(result.header['user-agent']).toBe('curl/7.68.0');
        }
    });


    it('Requête GET simple mais ne conteinne pas les délemiter de Body" ', () => {

        const simpleGet = `GET /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl/7.68.0
        `;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)
    
        expect(()=>httpParserRes.parseRequestHttp()).toThrow("Incomplete HTTP headers")
    });


    it('Requête sans Header" ', () => {

        const simpleGet = `\r\n\r\nTest test
        `;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)
    
        
        expect(httpParserRes.parseRequestHttp()).toBeNull();
    });


    it('FULL Request with header and body (TEXT)" ', () => {

        const simpleGet = `POST /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl/7.68.0\r\n\r\nhellloi daoehdndead`;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)

        const result = httpParserRes.parseRequestHttp();
    
        
        expect(result).not.toBeNull();

        if(result){

            expect(result.method).toBe('POST');
            expect(result.url).toBe('/index.html');
            expect(result.version).toBe('HTTP/1.1');
            expect(result.header['host']).toBe('example.com');
            expect(result.header['user-agent']).toBe('curl/7.68.0');
            expect(result.Body).toBe("hellloi daoehdndead")
        }
    });



    it('FULL Request with header and body JSON" ', () => {

        const simpleGet = `POST /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl/7.68.0\r\nContent-Type:application/json\r\n\r\n{"name":"ilyas","prenom":"dahhou"}`;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)

        const result = httpParserRes.parseRequestHttp();
    
        
        expect(result).not.toBeNull();

        if(result){

            expect(result.method).toBe('POST');
            expect(result.url).toBe('/index.html');
            expect(result.version).toBe('HTTP/1.1');
            expect(result.header['host']).toBe('example.com');
            expect(result.header['user-agent']).toBe('curl/7.68.0');
            expect(isJsonObject(JSON.stringify(result.Body))).toBe(true)
        }
    });


    it('FULL Request with header and body not valide json" ', () => {

        const simpleGet = `POST /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: curl/7.68.0\r\nContent-Type:application/json\r\n\r\n{"name":"ilyas""prenom":"dahhou"}`;

        const bufferRequest = Buffer.from(simpleGet);

        const httpParserRes = new HttpRequestParser(bufferRequest)

        expect(()=>{
            httpParserRes.parseRequestHttp()
        }).toThrow(InvalidJsonBodyError)
    
    
    });
})

function isJsonObject(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false; 
  }
}