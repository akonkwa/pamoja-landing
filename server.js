const http = require("http");
const fs = require("fs");
const path = require("path");
const { handleApi } = require("./lib/api");
const { ensureDb } = require("./lib/store");

const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

ensureDb();

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    const handled = await handleApi(req, res, pathname);
    if (handled) {
      return;
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      })
    );
    return;
  }

  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(publicDir, "index.html"));
  });
});

server.listen(port, host, () => {
  console.log(`PAMOJA MVP running on http://${host}:${port}`);
});
