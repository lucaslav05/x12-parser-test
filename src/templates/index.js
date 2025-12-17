import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const templatesDir = path.resolve("./src/templates");

export const templates = {};

/* ---------------- load JS templates ---------------- */

for (const file of fs.readdirSync(templatesDir)) {
  if (!file.endsWith(".js")) continue;
  if (file === "index.js") continue;

  const fileUrl = pathToFileURL(path.join(templatesDir, file)).href;
  const module = await import(fileUrl);

  if (!module.transactionSetId || typeof module.parse !== "function") {
    console.warn(`Skipping invalid template: ${file}`);
    continue;
  }

  templates[module.transactionSetId] = module;
}

console.log("Loaded templates:", Object.keys(templates));

/* ---------------- public API ---------------- */

export function getAvailableTemplates() {
  return Object.values(templates).map(t => ({
    id: t.transactionSetId,
    name: t.name
  }));
}

export function hasTemplate(id) {
  return !!templates[id];
}

export function getTemplate(id) {
  return templates[id];
}
