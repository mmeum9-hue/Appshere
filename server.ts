import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for upload (raw binary stream) - MUST be defined BEFORE body-parsers to avoid stream consumption issues
  app.post("/api/upload", (req, res) => {
    const fileId = req.headers["x-file-id"] as string;
    const fileName = decodeURIComponent(req.headers["x-file-name"] as string || "file");

    if (!fileId) {
      return res.status(400).json({ error: "Missing x-file-id header" });
    }

    const uploadDir = path.join("/tmp", "appshare_uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileId);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      console.log(`Successfully saved file ${fileName} (${fileId}) to server filesystem`);
      const downloadUrl = `/api/download/${fileId}?name=${encodeURIComponent(fileName)}`;
      res.json({ success: true, downloadUrl });
    });

    writeStream.on("error", (err) => {
      console.error("Server upload stream write error:", err);
      res.status(500).json({ error: "Failed to save file on server" });
    });
  });

  // Configure body limit to handle large uploads (e.g., APKs, videos, up to 100MB)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // API Route for health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route for download
  app.get("/api/download/:id", (req, res) => {
    const fileId = req.params.id;
    const fileName = req.query.name as string || "file";
    
    const uploadDir = path.join("/tmp", "appshare_uploads");
    const filePath = path.join(uploadDir, fileId);

    if (!fs.existsSync(filePath)) {
      console.warn(`Download requested for missing file: ${fileId} (${fileName})`);
      return res.status(404).send("Arquivo não encontrado no servidor. Por favor, tente enviar novamente.");
    }

    console.log(`Serving authentic file ${fileName} (${fileId}) from server filesystem`);
    
    // Attempt to guess content-type based on extension
    const ext = path.extname(fileName).toLowerCase();
    const isImage = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].includes(ext);

    if (isImage) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    } else {
      // Set attachment header so the browser triggers file download with original name
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    }
    
    if (ext === ".apk") {
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
    } else if (ext === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
    } else if (ext === ".zip") {
      res.setHeader("Content-Type", "application/zip");
    } else if (isImage) {
      res.setHeader("Content-Type", `image/${ext.replace(".", "")}`);
    } else {
      res.setHeader("Content-Type", "application/octet-stream");
    }

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
