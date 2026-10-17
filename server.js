import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
http
  .createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost");
      let file = path.resolve(root, "." + decodeURIComponent(u.pathname));
      if (!file.startsWith(root + path.sep) && file !== root) throw Error();
      if (u.pathname.endsWith("/")) file = path.join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4187, "127.0.0.1");
