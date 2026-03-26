import "dotenv/config";
import express from "express";
import cors from "cors";

import { blogRoutes, adminBlogRoutes } from "./Routes/blogRoutes.js";
import { subscriptionRoutes } from "./Routes/subscriptionRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();

// CORS 
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  })
);

// Body parsing 
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    message: "PVProtech API running 🚀",
    db: "DynamoDB",
    env: process.env.NODE_ENV || "development",
  })
);

// Routes 
app.use("/api/admin/blogs", adminBlogRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Error handlers 
app.use(notFound);
app.use(errorHandler);

// Start server 
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});