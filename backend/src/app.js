import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { requireJsonRequest } from "./middleware/jsonRequestMiddleware.js";
import { setSecurityHeaders } from "./middleware/securityHeaders.js";
import {
  requestIdMiddleware,
  apiNotFoundHandler,
  globalErrorHandler,
} from "./middleware/errorHandlerMiddleware.js";
import { loginRateLimiter, authRateLimiter } from "./middleware/rateLimitMiddleware.js";
import { router } from "./routes/index.js";
import { isCorsOriginAllowed } from "./security/corsPolicy.js";

export const app = express();
// Express App Initialization

app.set("trust proxy", env.trustProxy);
app.disable("x-powered-by");
app.use(requestIdMiddleware);
app.use(setSecurityHeaders);

// Global rate limiting: apply before any route processing
app.use("/api/auth/login", loginRateLimiter);
app.use("/api/auth/forgot-password", authRateLimiter);
app.use("/api/auth/verify-reset-otp", authRateLimiter);
app.use("/api/auth/reset-password", authRateLimiter);

// Always emit Vary: Origin header to prevent HTTP cache poisoning across different origins
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

function checkCorsOrigin(origin, callback) {
  // Requests without an Origin header are non-browser clients (cURL, Postman, server-to-server)
  if (!origin) {
    callback(null, true);
    return;
  }

  if (isCorsOriginAllowed(origin, env.corsOrigins)) {
    callback(null, true);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[CORS Blocked] Origin: "${origin}". Allowed origins:`, env.corsOrigins);
  }
  // Deny CORS permission by passing false to cors middleware (suppresses Access-Control-Allow-Origin header)
  callback(null, false);
}

app.use(
  cors({
    origin: checkCorsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "X-Requested-With", "X-Request-ID"],
    exposedHeaders: [
      "X-Total-Count",
      "X-Page",
      "X-Page-Size",
      "X-Total-Pages",
      "X-Request-ID",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
      "Retry-After",
    ],
    credentials: false,
    optionsSuccessStatus: 204,
  }),
);
app.use(requireJsonRequest);
app.use(express.json({ limit: "10mb" }));
app.use(router);

// Unknown route & global error handlers (must be registered last)
app.use(apiNotFoundHandler);
app.use(globalErrorHandler);
