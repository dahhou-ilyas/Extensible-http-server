import { buildHttpResponse,serializeHttpResponse } from "./builder/ResponseBuilder";

const response = buildHttpResponse(200,"")

console.log(serializeHttpResponse(response))