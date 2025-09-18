// app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import cookieParser from "cookie-parser";
// import helmet from "helmet";
import { fileURLToPath } from "url";
import pool from "./db.js";

import authRouter from "./routs/auth/auth.routes.js";
// middleware
import { authenticate } from "./middleware/auth.middleware.js";
//routs
import adminRoutes from "./routs/admin/admin.routs.js";
import profile from "./routs/admin/profile.routs.js";
import studentRouter from "./routs/student/student.routes.js";

// google img pproxy


import googleImageRouter from "./routs/googleimg/googleimg.js";
// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT;

// For serving static files (if needed later)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser()); 
// Security headers
// app.use(helmet());
// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "http://192.168.1.4:3000"], // adjust as needed
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// Base route
app.get("/", authenticate, (req, res) => {
  res.send({ message: "Yearbook API is running..." });
});

// ---------- API Routes ----------

// Public
app.use("/api/v1/auth", authRouter);

// students
app.use("/api/v1/student",  studentRouter);

// admin
// app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/admin", profile);


// image proxy 
app.use("/api/v1/google-image", googleImageRouter);



// ---------- Error & 404 Handling ----------

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️ 404 - ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Server Error:", err.stack || err.message);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal server error" });
});

// ---------- DB Connection Test ----------
(async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Database connected. Current time:", result.rows[0]);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
})();

// ---------- Start Server ----------
app.listen(PORT, () => {
  if (process.env.NODE_ENV === "development") {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  } else {
    console.log(`✅ Server running on port ${PORT}`);
  }
});

export default app;
