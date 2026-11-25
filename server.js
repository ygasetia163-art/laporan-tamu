const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxoWIVq9IEfJwdzL87Lb3-UBKPxg_mzPeqynzPrUDaUOvkT-zX6OQVwDBvvffbQE6fqrw/exec";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // API: Forward to Google Apps Script or record complaints
  if (pathname === "/api/complaints" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        console.log(`[Laporan Diterima] Kamar: ${payload.room}, Kendala: ${payload.issues || payload.category}`);

        // Forward to Google Apps Script
        try {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          console.log("[Google Sheets] Terkirim ke Google Apps Script.");
        } catch (gasErr) {
          console.warn("[Google Sheets Warn]", gasErr.message);
        }

        res.writeHead(201, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ ok: true, message: "Laporan berhasil diterima & diteruskan ke Google Sheets." }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  // Route: Root (/) -> index.html
  let filePath;
  if (
    pathname === "/" ||
    pathname === "/room-service" ||
    pathname === "/index.html" ||
    pathname.includes("web-input-laporan-komplain-kamar.html")
  ) {
    filePath = path.join(__dirname, "index.html");
  } else {
    const cleanPath = pathname.replace(/^\/+/, "");
    filePath = path.join(__dirname, cleanPath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html
      const fallback = path.join(__dirname, "index.html");
      if (fs.existsSync(fallback)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        fs.createReadStream(fallback).pipe(res);
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Room Service Portal Aktif:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`====================================================`);
});
