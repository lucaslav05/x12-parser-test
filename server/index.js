import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Transaction } from "node-x12-edi";
import {
  getTemplate,
  getAvailableTemplates,
  hasTemplate
} from "../src/templates/index.js";

/* -------------------- setup -------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

/* -------------------- middleware -------------------- */

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.text({ limit: "10mb" }));

/* -------------------- API routes -------------------- */

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

app.post("/api/parse", async (req, res) => {
  try {
    const ediContent = typeof req.body === "string" ? req.body : req.body?.edi;
    const requestedType = req.body?.type;

    if (!ediContent || !ediContent.includes("ISA")) {
      return res.status(400).json({
        error: "Invalid EDI content",
        message: "EDI must contain an ISA segment"
      });
    }

    // 1) create the Transaction instance
    const transaction = new Transaction();

    // 2) generate segments from raw content
    transaction.generateSegments(ediContent);

    // 3) finalize loops so loop maps work correctly
    transaction.runLoops();

    // 4) determine type
    const detectedType = transaction.getTransactionSetId?.() || transaction.header?.ST?.transactionSetId;
    const transactionType = requestedType || detectedType;

    if (!transactionType) {
      return res.status(400).json({
        error: "Unable to determine EDI type"
      });
    }

    if (!hasTemplate(transactionType)) {
      return res.status(400).json({
        error: "Unsupported EDI type",
        detectedType,
        availableTypes: getAvailableTemplates().map(t => t.transactionSet)
      });
    }

    const template = getTemplate(transactionType);

    // 5) map segments to JSON using your JSON template
    const data = transaction.mapSegments(template);

    res.json({
      success: true,
      detectedType,
      usedType: transactionType,
      data
    });
  } catch (err) {
    console.error("Parse error:", err);
    res.status(500).json({
      error: "Parse error",
      message: err.message
    });
  }
});

/* -------------------- frontend -------------------- */
/* Serve Vite build output */

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

/* Catch-all: send index.html for browser routes */
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

/* -------------------- start server -------------------- */

app.listen(PORT, () => {
  console.log(`EDI Parser running at http://localhost:${PORT}`);
});
