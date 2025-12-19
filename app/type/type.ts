import * as net from "net";

export type HttpRequest = {
    method : string;
    url : string;
    version : string;
    header : Record<string, string>;
    Body? : String,
    params? : Record<string,any>
}


export type HttpResponse = {
    statusCode : number;
    statusMessage : string;
    headers: Record<string, string>;
    body: string;
}

export enum METHODE {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE"
}


export type NextFunction = () => void;

export type Middleware = (req: HttpRequest, res: HttpResponse, next: NextFunction) => void;

export type Handler = (req: HttpRequest, res: HttpResponse) => void;