export type HttpRequest = {
    method : string;
    url : string;
    version : string;
    header : Record<string, string>;
    Body? : String
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