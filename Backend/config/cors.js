const allowedOrigins = (process.env.CLIENT_URL || process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

/** Vercel production + preview deployments (*.vercel.app) */
const vercelOriginPattern =
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i;

export const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);

    if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return cb(null, true);
    }

    if (allowedOrigins.includes(origin)) return cb(null, true);

    if (vercelOriginPattern.test(origin)) return cb(null, true);

    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export const getAllowedOrigins = () => allowedOrigins;
