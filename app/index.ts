import type { Handler, HttpRequest, HttpResponse } from "./type/type";

function test(req: HttpRequest, res: HttpResponse){

}

const paths = {
    "/test/test":test,
    "/{had}/test/{ab}/test":test,
}

const path = "/120/test/ee/test"

const req:HttpRequest={
    method: "",
    url: "",
    version: "",
    header: {},
    params:{},
}

function searchForPtterPath(paths:Record<string,Handler>,path:string,req:HttpRequest){
    let finalPath = "";
    const keys = Object.keys(paths);
    for(const key of keys){
        const pathList = path.split("/");
        const keyList = key.split("/");
        
        if(keyList.length!=pathList.length) continue;

        for(let i=0;i<keyList.length;i++){
            if(!keyList[i].startsWith("{") || !keyList[i].endsWith("}")){
                if(keyList[i]==pathList[i]){
                    continue;
                }else{
                    req.params={};
                }
            }else{
                const variable = keyList[i].slice(1, -1);
                //je doit remplire le request par path params les varibal
                if(!req.params){
                    req.params={}
                }
                req.params[variable]=pathList[i]
            }
        }
    }

    if (!req.params || Object.keys(req.params).length === 0) return false;
    return true;
}
