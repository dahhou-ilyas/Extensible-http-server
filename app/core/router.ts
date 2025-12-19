
import { ValidePathException } from "../exceptions/exceptions";
import type {Middleware, Handler, HttpRequest, HttpResponse} from "../type/type"
import {METHODE} from "../type/type"
import { parseMethod } from "../utils/utils";

export class Router {
    private middlwares : Middleware[] = [];

    private route : Record<METHODE,Record<string,Handler>> ={
        [METHODE.GET]: {},
        [METHODE.POST]: {},
        [METHODE.PUT]: {},
        [METHODE.DELETE]: {}
    }

    public use(middl : Middleware){
        this.middlwares.push(middl);
    }

    public register(methode:METHODE,path:string,func : Handler){
        if (!path || typeof path !== "string") {
          throw new ValidePathException("Path is required");
        }

        if (!path.startsWith("/")) path = "/" + path;

        if (path === "/") {
          this.route[methode]["/"] = func;
          return;
        }

        let parts = path.split("/");
        // remove first part if the path start whith / ==> ["", .... ] always we start with ""
        if (parts[0] === "") parts = parts.slice(1);
        //same if the path end with /
        if (parts[parts.length - 1] === "") parts.pop();

        for (const part of parts) {
            if (!part) {
              throw new ValidePathException("Not a valid path: empty segment (double slash)");
            }

            const isParam = part.startsWith("{") && part.endsWith("}");

            if (isParam){
                const name = part.slice(1, -1);
                if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
                  throw new ValidePathException(`Invalid param name: {${name}}`);
                }
            }else {
              if (!/^[A-Za-z0-9._-]+$/.test(part)) {
                throw new ValidePathException(`Invalid segment: "${part}"`);
              }
            }
        }

        const normalized = "/" + parts.join("/");

        this.route[methode][normalized] = func;
    }


    // cette méthode et appelle dnas le socker on préparer le req par parseRequest et la resp on le donné un remplater a fin de le remplire

    // et par la suite on prendre cette reponser et le envoyé
    public async handle(req:HttpRequest,resp : HttpResponse){
        
        const {method,url}=req;

        const METhode = parseMethod(method)

        if (!METhode){
            resp.statusCode=405;
            resp.body = "Method Not Allowed";
            return;
        }

        const finalHandler = this.route[METhode][url];

        const isMatchingHandler = this.searchForPtterPath(this.route[METhode],url,req)

        if(!finalHandler && isMatchingHandler==null){
            resp.statusCode=404
            resp.body = "Not Found";
            return;
        }

        let index = 0;

        //un appelle récursive de next pour chaque middlware on apelle next qui vas passé nous vers autre middlware

        const next =async ()=>{
            if(index < this.middlwares.length){
                const mw = this.middlwares[index++];
                await mw(req, resp, next);
            }
            else {
                const handler = finalHandler || (isMatchingHandler as Handler);
                await handler(req, resp);
            }
        }

        await next()
    }


    searchForPtterPath(paths:Record<string,Handler>,path:string,req:HttpRequest){
        const keys = Object.keys(paths);
        for(const key of keys){
            const pathList = path.split("/");
            const keyList = key.split("/");
            
            if(keyList.length!=pathList.length) continue;

            let matched = true;
            const tempParams: Record<string, string> = {};
        
            for(let i=0;i<keyList.length;i++){
                if(!keyList[i].startsWith("{") || !keyList[i].endsWith("}")){
                    if (keyList[i] == pathList[i]) {
                      continue;
                    } else {
                      matched = false;
                      break;
                    }
                }else{
                  const variable = keyList[i].slice(1, -1);
                  tempParams[variable] = pathList[i];
                }
            }

            if (matched) {
              req.params = tempParams;
              return paths[key];
            }
        }
        return null;
    }


}