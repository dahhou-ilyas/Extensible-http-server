
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
        this.route[methode][path]=func
    }


    // cette méthode et appelle dnas le socker on préparer le req par parseRequest et la resp on le donné un remplater a fin de le remplire

    // et par la suite on prendre cette reponser et le envoyé
    public handle(req:HttpRequest,resp : HttpResponse){
        
        const {method,url}=req;

        const METhode = parseMethod(method)

        if (!METhode){
            resp.statusCode=405;
            resp.body = "Method Not Allowed";
            return;
        }

        const finalHandler = this.route[METhode][url];

        if(!finalHandler){
            resp.statusCode=404
            resp.body = "Not Found";
            return;
        }

        let index = 0;

        //un appelle récursive de next pour chaque middlware on apelle next qui vas passé nous vers autre middlware

        const next = ()=>{
            if(index < this.middlwares.length){
                const mw = this.middlwares[index++];
                mw(req, resp, next);
            }
            else {
                finalHandler(req, resp);
            }
        }

        next()
    }

}