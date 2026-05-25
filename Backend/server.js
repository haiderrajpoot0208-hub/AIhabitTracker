import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { corsOptions } from "./config/cors.js";
import authRoutes from "./routes/auth.js";
import habitRoutes from "./routes/habits.js";
import logRoutes from "./routes/logs.js";
import aiRoutes from "./routes/ai.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

function validateProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;

  const missing = [];
  if (!process.env.MONGO_URI && !process.env.MONGODB_URI) missing.push("MONGO_URI");
  if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
  if (!process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
    missing.push("CLIENT_URL (your Vercel URL, comma-separated if multiple)");
  }

  if (missing.length) {
    console.error(
      "Missing required production environment variables:\n  - " +
        missing.join("\n  - ")
    );
    process.exit(1);
  }
}

validateProductionEnv();

const app = express();

app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "AI Habit Tracker API",
    health: "/api/health",
    docs: "Set VITE_API_URL on Vercel to this service URL + /api",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";

connectDB()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Server listening on ${HOST}:${PORT}`);
      console.log(`Health: /api/health`);
      if (process.env.NODE_ENV === "production") {
        console.log(`CORS allowed origins: ${(process.env.CLIENT_URL || "").split(",").join(", ")} + *.vercel.app`);
      }
    });
  })
  .catch(() => {
    process.exit(1);
  });
