import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { initDb, listBooks, createBook, updateBook, deleteBook } from "./db.js";

const app = express();

app.use(cors());
app.use(express.json());

/* ================= DB INIT ================= */
await initDb();

/* ================= API ROUTES ================= */

app.get("/api/books", async (req, res, next) => {
  try {
    res.json(await listBooks());
  } catch (e) {
    next(e);
  }
});

app.post("/api/books", async (req, res) => {
  try {
    res.status(201).json(await createBook(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message || "Hiba" });
  }
});

app.put("/api/books/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateBook(id, req.body);
    if (!updated) return res.status(404).json({ error: "Nincs ilyen könyv." });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: e.message || "Hiba" });
  }
});

app.delete("/api/books/:id", async (req, res, next) => {
  try {
    const ok = await deleteBook(Number(req.params.id));
    res.json({ ok });
  } catch (e) {
    next(e);
  }
});

app.post("/api/shutdown", (req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 200);
});

/* ================= FRONTEND SERVE (CSAK PROD) ================= */

if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicDir = path.join(__dirname, "public");

  app.use(express.static(publicDir));

  // Express 5 kompatibilis wildcard
  app.get("/*", (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
