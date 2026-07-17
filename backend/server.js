// server.js - app entry point

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("./db"); // initializes + seeds the database on first run

const authRoutes = require("./routes/auth");
const staffRoutes = require("./routes/staff");
const studentRoutes = require("./routes/student");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/student", studentRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Unknown API routes must answer as JSON, never fall through to the SPA below.
app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));

// ---------- Serve the built frontend (single-service deploy) ----------
// In development the Vite dev server handles the UI and proxies /api here, so
// this only kicks in once `npm run build` has produced frontend/dist.
const distPath = path.join(__dirname, "..", "frontend", "dist");

if (fs.existsSync(path.join(distPath, "index.html"))) {
  app.use(express.static(distPath));

  // React Router owns the client-side routes, so any non-API path returns
  // index.html — without this, refreshing /staff/dashboard would 404.
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

  console.log("Serving built frontend from frontend/dist");
}

// Basic error handler (e.g. multer file-type rejections)
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
