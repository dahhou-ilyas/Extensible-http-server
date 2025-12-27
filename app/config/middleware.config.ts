import type { MiddlewareConfiguration } from "../middleware/types";

export const middlewareConfig: MiddlewareConfiguration = {
  global: {
    errorHandling: 'continue',        // 'continue' or 'stop' - continue allows other middlewares to run even if one fails
    performanceMonitoring: true,      // Monitor middleware execution time
    maxExecutionTimeMs: 5000,         // Warn if a middleware takes longer than this
  },

  middlewares: {
    logger: {
      enabled: true,
      priority: 10,  // Execute first to capture all requests
      options: {
        colorize: true,
        logRequestHeaders: false,    // Set to true for detailed debugging
        logRequestBody: false,        // Set to true for detailed debugging
        logResponseHeaders: false,    // Set to true for detailed debugging
        logResponseBody: false,       // Set to true for detailed debugging
      },
    },

    // CORS - Cross-Origin Resource Sharing
    cors: {
      enabled: false,  // Enable if you need CORS support
      priority: 20,
      options: {
        origin: "*",  // Allow all origins. For production, use specific origins: ["http://localhost:3000"]
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: false,
        maxAge: 86400,  // 24 hours cache for preflight
      },
    },

    // Rate Limiting - Prevent abuse
    rateLimit: {
      enabled: false,  // Enable to protect your API
      priority: 30,
      options: {
        windowMs: 60000,      // 1 minute window
        maxRequests: 100,     // 100 requests per minute per IP
        message: "Too many requests from this IP, please try again later.",
      },
    },

    // Authentication - Protect routes
    auth: {
      enabled: false,  // Enable to require authentication
      priority: 40,
      options: {
        type: "bearer",  // 'basic', 'bearer', or 'custom'
        realm: "Protected Area",

        // For basic auth, provide users:
        // users: {
        //   "admin": "password123",
        //   "user": "userpass"
        // },

        // For bearer/custom auth, provide validateToken:
        // validateToken: (token: string) => {
        //   // Your JWT validation logic here
        //   return token === "valid-secret-token";
        // },
      },
    },
  },
};