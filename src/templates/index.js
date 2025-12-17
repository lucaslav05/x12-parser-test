import fs from "fs";
import path from "path";

const templatesDir = path.resolve("./src/templates");

export const templates = {};

fs.readdirSync(templatesDir).forEach(file => {
  if (file.endsWith(".json")) {
    const content = fs.readFileSync(path.join(templatesDir, file), "utf8");
    const json = JSON.parse(content);
    templates[json.transactionSet] = json;
  }
});

export function getAvailableTemplates() {
  return Object.values(templates);
}

export function hasTemplate(id) {
  return !!templates[id];
}

export function getTemplate(id) {
  return templates[id];
}
