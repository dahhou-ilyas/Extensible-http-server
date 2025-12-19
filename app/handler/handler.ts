import type { HttpRequest, HttpResponse } from "../type/type";


export function simpleSuccesForGet(req: HttpRequest, res: HttpResponse){
    res.statusCode=200;
}