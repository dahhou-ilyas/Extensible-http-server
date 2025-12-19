import type { HttpRequest, HttpResponse } from "../type/type";
import fs from "fs";
import { readFile } from "fs/promises";


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

export async function fileHandler(req: HttpRequest, res: HttpResponse){
    console.log("xxxxxxxxxxxx")
    console.log(req)
    const fileName = req?.params?.filename;

    const path = "/tmp/data/codecrafters.io/http-server-tester/"+fileName;
    try{
        if (fs.existsSync(path)) {
            const data = await readFile(path, "utf-8");
            res.statusCode=200
            res.body=data;
            res.headers["Content-Type"]="application/octet-stream"
            console.log("rrrrrrrrrrrrrrrr")
            console.log(res)
        } else {
            res.statusCode=404
            res.headers["Content-Type"]="application/octet-stream"
        }
    }catch{
        console.error("error while reading file")
    }
    
}