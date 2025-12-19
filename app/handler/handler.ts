import type { HttpRequest, HttpResponse } from "../type/type";


export function simpleSuccesForGet(req: HttpRequest, res: HttpResponse){
    res.statusCode=200;
}


export function handleEcho(req: HttpRequest, res: HttpResponse){
    const echo = req?.params?.str;

    res.statusCode=200;
    res.body=echo;
}


export function handlerUserAgent(req: HttpRequest, res: HttpResponse){
    const userAgent = req.header["user-agent"]

    if (userAgent) {
        res.body=userAgent;
        res.statusCode=200;
    }
}