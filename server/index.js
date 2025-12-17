import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { parseEDI } from "../src/ediParser.js";
import {
  getTemplate,
  getAvailableTemplates,
  hasTemplate
} from "../src/templates/index.js";

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- paths (ESM-safe) -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.join(__dirname, "../client");

/* -------------------- middleware -------------------- */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.text({ limit: "10mb" }));

/* 🔹 serve frontend */
app.use(express.static(CLIENT_DIR));

/* -------------------- api routes -------------------- */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/templates", (req, res) => {
  res.json({
    templates: getAvailableTemplates()
  });
});

app.post("/api/parse", (req, res) => {
  try {
    const ediContent =
      typeof req.body === "string" ? req.body : req.body?.edi;

    const requestedType = req.body?.type;

    if (!ediContent || typeof ediContent !== "string") {
      return res.status(400).json({
        error: "Invalid input",
        message: "Provide EDI content as raw text or { edi: string }"
      });
    }

    if (!ediContent.includes("ISA")) {
      return res.status(400).json({
        error: "Invalid EDI format",
        message: "EDI content must contain an ISA segment"
      });
    }

    const parsedEDI = parseEDI(ediContent);
    const detectedType = parsedEDI.getTransactionSetId();
    const transactionType = requestedType || detectedType;

    if (!transactionType) {
      return res.status(400).json({
        error: "Unable to determine EDI type",
        message: "Could not detect transaction set from ST segment"
      });
    }

    if (!hasTemplate(transactionType)) {
      return res.status(400).json({
        error: "Unsupported EDI type",
        message: `No template available for transaction set: ${transactionType}`,
        detectedType,
        availableTypes: getAvailableTemplates().map(t => t.id)
      });
    }

    const template = getTemplate(transactionType);
    const result = template.parse(parsedEDI);

    res.json({
      success: true,
      detectedType,
      usedType: transactionType,
      segmentCount: parsedEDI.segments.length,
      data: result
    });
  } catch (error) {
    console.error("Parse error:", error);
    res.status(500).json({
      error: "Parse error",
      message: error.message
    });
  }
});

app.post("/api/build", (req, res) => {
  const { type, data, meta } = req.body;

  if (!hasTemplate(type)) {
    return res.status(400).json({ error: "Unsupported type" });
  }

  const edi = getTemplate(type).build(data, meta);
  res.json({ edi });
});

/* 🔹 browser fallback (optional but recommended) */
app.get("*", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

/* -------------------- start server -------------------- */

app.listen(PORT, () => {
  console.log(`EDI Parser API running on http://localhost:${PORT}`);
});
