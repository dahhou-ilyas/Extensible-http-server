import type { HttpResponse } from "../type/type";

const STATUS_MESSAGES: Record<number, string> = {
  200: "OK",
  201: "Created",
  301: "Moved Permanently",
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error",
  405:"Method Not Allowed",
};

export function buildHttpResponse(resp : HttpResponse): HttpResponse {
  const statusMessage = STATUS_MESSAGES[resp?.statusCode] || "Unknown";
  resp.headers["Content-Length"] = Buffer.byteLength(resp?.body).toString();
  console.log("7777777777777777777777777777")
  console.log(resp.headers["Content-Type"])
  resp.headers["Content-Type"] = resp.headers["Content-Type"] || "text/plain";

  return { statusCode:resp?.statusCode, statusMessage, headers:resp?.headers, body:resp?.body };
}



export function serializeHttpResponse(
  response: HttpResponse,
  version: string = "HTTP/1.1"
): string {
  const headerLines = Object.entries(response.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\r\n");

  return `${version} ${response.statusCode} ${response.statusMessage}\r\n${headerLines}\r\n\r\n${response.body}`;
}