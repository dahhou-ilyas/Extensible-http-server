import { METHODE } from "../type/type";

export function isJsonObject(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false; 
  }
}


export function parseMethod(method: string): METHODE | undefined {
  const upper = method.toUpperCase();

  switch (upper) {
    case "GET":
      return METHODE.GET;
    case "POST":
      return METHODE.POST;
    case "PUT":
      return METHODE.PUT;
    case "DELETE":
      return METHODE.DELETE;
    default:
      return undefined;
  }
}