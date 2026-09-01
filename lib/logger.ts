type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  route?: string;
  method?: string;
  statusCode?: number;
  latencyMs?: number;
  userId?: string;
  correlationId?: string;
  error?: any;
  context?: Record<string, any>;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "key",
  "authorization",
  "bankAccount",
  "accountNumber",
  "ifsc",
  "pan",
  "ssn",
  "otp",
];

function sanitize(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()));
    if (isSensitive) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatLog(level: LogLevel, data: LogPayload) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    environment: process.env.NODE_ENV || "production",
    message: data.message,
    route: data.route,
    method: data.method,
    statusCode: data.statusCode,
    latencyMs: data.latencyMs,
    userId: data.userId,
    correlationId: data.correlationId || `req_${Math.random().toString(36).substring(2, 10)}`,
    error: data.error?.message || data.error,
    context: sanitize(data.context),
  });
}

export const logger = {
  info: (data: LogPayload) => console.log(formatLog("info", data)),
  warn: (data: LogPayload) => console.warn(formatLog("warn", data)),
  error: (data: LogPayload) => console.error(formatLog("error", data)),
  debug: (data: LogPayload) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(formatLog("debug", data));
    }
  },
};
