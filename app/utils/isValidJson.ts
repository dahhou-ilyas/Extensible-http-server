export function isJsonObject(body: string): boolean {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false; 
  }
}