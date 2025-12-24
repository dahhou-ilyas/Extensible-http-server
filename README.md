# HTTP/1.1 Server - TypeScript Implementation

[![progress-banner](https://backend.codecrafters.io/progress/http-server/a4c8e686-92b8-40e4-8b49-dacaea5f785f)](https://app.codecrafters.io/users/codecrafters-bot?r=2qF)

> A production-grade HTTP/1.1 server built from scratch using raw TCP sockets, implementing advanced features like HTTP pipelining, chunked transfer encoding, and content compression.

## Overview

This project is a fully-featured HTTP/1.1 server implementation developed as part of the [CodeCrafters HTTP Server Challenge](https://codecrafters.io). Unlike traditional implementations using high-level frameworks, this server is built directly on top of TCP sockets using Node.js `net` module, providing deep insights into HTTP protocol internals.

### Key Features

**Core HTTP/1.1 Protocol**
- Full support for GET, POST, PUT, DELETE methods
- Custom HTTP request parser with buffer-based processing
- Structured HTTP response builder
- Pattern-based routing with dynamic path parameters (`/files/{filename}`)
- Middleware pipeline support

**Advanced HTTP Features**
- **HTTP Pipelining**: Multiple requests on a single persistent connection
- **Chunked Transfer Encoding**: Both request and response streaming
- **Content Compression**: gzip, deflate, and brotli support
- **Connection Keep-Alive**: Configurable timeout (5s default)
- **TCP Fragmentation Handling**: Robust buffer accumulation strategy

**Production-Ready Capabilities**
- Concurrent client connection handling
- Robust error handling with custom exception hierarchy
- Request body parsing (JSON, plain text)
- File upload/download operations
- Comprehensive test coverage (Jest + integration tests)

## Technical Highlights

### Architecture

```
app/
├── builder/          # HTTP response construction
│   └── ResponseBuilder.ts
├── core/             # Routing engine
│   └── router.ts
├── exceptions/       # Custom error types
│   └── exceptions.ts
├── handler/          # Request handlers
│   └── handler.ts
├── parser/           # HTTP request parsing
│   └── ParseRequestHttp.ts
├── type/             # TypeScript type definitions
│   └── type.ts
├── utils/            # Utility functions
│   └── utils.ts
└── main.ts           # TCP server entry point
```

### How It Works

#### TCP Fragmentation & HTTP Chunking

The server elegantly handles two distinct types of data fragmentation:

1. **TCP-level fragmentation**: Network packets arrive in arbitrary chunks due to MTU limits and network conditions
2. **HTTP-level chunking**: Deliberate streaming via `Transfer-Encoding: chunked`

**Buffer Accumulation Strategy:**

```typescript
let buffer = Buffer.alloc(0);

socket.on("data", async (chunk: Buffer) => {
  // Accumulate TCP chunks
  buffer = Buffer.concat([buffer, chunk]);

  // Process complete requests in a loop (pipelining)
  while (buffer.length > 0) {
    const parser = new HttpRequestParser(buffer);

    try {
      request = parser.parseRequestHttp();
      // Process request...
      buffer = sliceCurrentRequest(buffer, request);
    } catch (error) {
      // Incomplete headers or chunked body - wait for more data
      if (error instanceof IncompleteHttpHeadersError) {
        break;
      }
      if (error.message.includes("Incomplete chunked body")) {
        break;
      }
    }
  }
});
```

This design allows the server to:
- Handle partial HTTP headers arriving across multiple TCP packets
- Support `Transfer-Encoding: chunked` by waiting for the terminal `0\r\n\r\n`
- Process multiple pipelined requests from the same buffer
- Maintain connection state between data events

#### Request Processing Pipeline

```
TCP Socket → Buffer Accumulation → HTTP Parser → Router → Handler → Response Builder → TCP Socket
     ↑                                  ↓                     ↓              ↓
     └──────────── Keep-Alive Loop ─────┴─── Middleware ─────┴── Compression
```

## API Reference

### Supported Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/` | Health check | `200 OK` |
| `GET` | `/echo/{str}` | Echo service - returns the path parameter | `200 OK` with echoed string |
| `GET` | `/user-agent` | Returns the User-Agent header value | `200 OK` with User-Agent string |
| `GET` | `/files/{filename}` | Download file from server | `200 OK` with file content or `404 Not Found` |
| `POST` | `/files/{filename}` | Upload file to server | `201 Created` on success |

### Request/Response Examples

#### Echo Service

```bash
# Request
GET /echo/hello-world HTTP/1.1
Host: localhost:4221

# Response
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 11

hello-world
```

#### User-Agent Detection

```bash
# Request
GET /user-agent HTTP/1.1
Host: localhost:4221
User-Agent: curl/7.68.0

# Response
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 12

curl/7.68.0
```

#### File Upload with Compression

```bash
# Request
POST /files/data.txt HTTP/1.1
Host: localhost:4221
Content-Type: text/plain
Content-Encoding: gzip
Content-Length: 45

[gzipped binary data: "Sample file content"]

# Response
HTTP/1.1 201 Created
Content-Length: 0
```

#### File Download with Compression Negotiation

```bash
# Request
GET /files/data.txt HTTP/1.1
Host: localhost:4221
Accept-Encoding: gzip, deflate, br

# Response
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Encoding: gzip
Content-Length: 45

[gzipped binary data]
```

## Getting Started

### Prerequisites

- **Bun Runtime**: Version 1.2 or higher ([installation guide](https://bun.sh/))
- **Node.js**: Version 18+ (for npm scripts)
- **Operating System**: Linux, macOS, or Windows

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/codecrafters-http-server-typescript.git
cd codecrafters-http-server-typescript

# Install dependencies (if any)
npm install
```

### Running the Server

```bash
# Using Bun (recommended)
npm run dev

# Using the provided script
./your_program.sh

# Alternative: using tsx
npm run dev3

# Server starts on localhost:4221
```

### Configuration

Default server configuration in [app/main.ts](app/main.ts):

```typescript
const PORT = 4221;
const HOST = "localhost";
const KEEP_ALIVE_TIMEOUT = 5000; // milliseconds
```

## Testing

### Unit Tests

```bash
# Run Jest test suite
npm test
```

**Test coverage includes:**
- HTTP request parsing (headers, body, chunked encoding)
- Header validation
- Body parsing (text/JSON)
- Compression/decompression
- Error handling scenarios

### Integration Tests

```bash
# HTTP Pipelining test (requires server running on localhost:4221)
node test-pipelining.js
```

**Validates:**
- Multiple pipelined GET requests
- POST + GET pipelining
- Incomplete request handling
- Connection: close behavior

### Manual Testing with cURL

```bash
# Basic GET request
curl -v http://localhost:4221/

# Echo test
curl http://localhost:4221/echo/test-message

# File upload
echo "Hello World" | curl -X POST --data-binary @- http://localhost:4221/files/test.txt

# File download with compression
curl -H "Accept-Encoding: gzip" http://localhost:4221/files/test.txt --compressed

# Pipelined requests (using netcat)
(echo -ne "GET / HTTP/1.1\r\nHost: localhost\r\n\r\nGET / HTTP/1.1\r\nHost: localhost\r\n\r\n") | nc localhost 4221
```

## Implementation Deep Dive

### Custom HTTP Parser

The [HttpRequestParser](app/parser/ParseRequestHttp.ts) class handles:
- Request line parsing (method, URL, HTTP version)
- Header extraction with case-insensitive keys
- Body completeness verification (Content-Length vs Transfer-Encoding)
- Chunked body decoding (hex size → data → terminal chunk)
- Content decompression (gzip/deflate/brotli)
- JSON body validation

### Pattern-Based Router

The [Router](app/core/router.ts) class provides:
- Path parameter extraction (`/files/{filename}`)
- Method-specific route registration
- Middleware execution pipeline
- 404/405 automatic error responses

### Response Builder

The [ResponseBuilder](app/builder/ResponseBuilder.ts) module:
- Negotiates compression based on `Accept-Encoding`
- Sets appropriate `Content-Type` and `Content-Length`
- Handles `Connection: close` header
- Serializes response to raw TCP buffer

## Error Handling

Custom exception hierarchy:
- `IncompleteHttpHeadersError`: Headers not fully received
- `HttpParsingError`: Malformed HTTP syntax
- `InvalidJsonBodyError`: Invalid JSON in request body
- `UnsupportedContentEncodingError`: Unknown compression algorithm
- `ValidePathException`: Invalid route path pattern

## Performance Characteristics

- **Concurrent Connections**: Limited by OS file descriptors (typically 1024+)
- **Keep-Alive**: Reduces connection overhead for multiple requests
- **HTTP Pipelining**: Eliminates round-trip latency between requests
- **Compression**: Reduces bandwidth by 70-90% for text content

## Project Evolution

This implementation was developed through CodeCrafters stages:

1. Basic TCP server setup
2. HTTP request parsing
3. Header handling
4. Response building
5. Routing with path parameters
6. File operations (upload/download)
7. Compression support
8. Chunked transfer encoding
9. HTTP pipelining
10. Connection persistence and keep-alive

## Development

### Available Scripts

```json
{
  "dev": "bun run app/main.ts",      // Run server with Bun
  "dev1": "tsx app/index.ts",         // Alternative entry point
  "dev3": "tsx app/main.ts",          // Run server with tsx
  "test": "jest"                      // Run test suite
}
```

### Project Structure

- `app/main.ts` - TCP server and connection management
- `app/parser/` - HTTP request parsing logic
- `app/builder/` - HTTP response construction
- `app/core/` - Routing and middleware
- `app/handler/` - Request handlers for each endpoint
- `__tests__/` - Jest unit tests
- `test-pipelining.js` - Integration tests

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [CodeCrafters](https://codecrafters.io) for the excellent learning platform
- HTTP/1.1 Specification ([RFC 2616](https://www.rfc-editor.org/rfc/rfc2616))
- [Bun runtime](https://bun.sh/) for TypeScript execution

---

**Built with TypeScript, Bun, and a deep understanding of HTTP internals.**
