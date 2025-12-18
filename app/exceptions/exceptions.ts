export class InvalidJsonBodyError extends Error {
  constructor(message = "Invalid JSON body") {
    super(message); // passe le message à la classe Error
    this.name = "InvalidJsonBodyError"; // nom personnalisé
  }
}


export class UnsupportedContentEncodingError extends Error {
  public readonly encoding: string;

  constructor(encoding: string) {
    super(`Unsupported Content-Encoding: ${encoding}`);
    this.name = "UnsupportedContentEncodingError";
    this.encoding = encoding;
  }
}


export class IncompleteHttpHeadersError extends Error {
  constructor() {
    super("Incomplete HTTP headers: missing \\r\\n\\r\\n delimiter");
    this.name = "IncompleteHttpHeadersError";
  }
}


export class HttpParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HttpParsingError";
  }
}