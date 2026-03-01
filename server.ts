import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

console.log("SERVER.TS LOADING...");

const dbPath = "rhythm.db";
let db: any;

async function startServer() {
  const app = express();
  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  
  try {
    db = new Database(dbPath);
    console.log("Database initialized at", dbPath);
    
    // 初始化数据库
    db.exec(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT,
        artist TEXT,
        audioUrl TEXT,
        coverUrl TEXT,
        bpm INTEGER,
        notes TEXT
      )
    `);
    console.log("Database schema verified");
  } catch (dbError) {
    console.error("Failed to initialize database:", dbError);
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  
  const PORT = 3000;

  // 请求日志中间件
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`${new Date().toISOString()} - [API REQUEST] ${req.method} ${req.url}`);
    }
    next();
  });

  // API 路由 (直接挂载到 app 以确保优先级)
  app.get("/api/songs", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      console.log("GET /api/songs - Fetching from DB");
      const songs = db.prepare("SELECT * FROM songs").all();
      const parsedSongs = songs.map((s: any) => {
        try {
          return { ...s, notes: JSON.parse(s.notes || "[]") };
        } catch (e) {
          console.error(`Failed to parse notes for song ${ s.id }`, e);
          return { ...s, notes: [] };
        }
      });
      res.json(parsedSongs);
    } catch (error) {
      console.error("Error fetching songs:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/songs", (req, res) => {
    try {
      if (!db) throw new Error("Database not initialized");
      console.log("POST /api/songs - Saving:", req.body.title);
      const { id, title, artist, audioUrl, coverUrl, bpm, notes } = req.body;
      const insert = db.prepare(`
        INSERT OR REPLACE INTO songs (id, title, artist, audioUrl, coverUrl, bpm, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(id, title, artist, audioUrl, coverUrl, bpm, JSON.stringify(notes));
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving song:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: !!db });
  });

  // Vite 开发中间件
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // 改为 custom 以避免过度激进的 HTML 服务
    });
    
    app.use(vite.middlewares);
    
    // 手动处理 SPA 回退
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        console.error("Vite transform error:", e);
        next(e);
      }
    });
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
