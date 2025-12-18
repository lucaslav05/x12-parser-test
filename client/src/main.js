const templateSelect = document.getElementById("templateSelect");
const ediInput = document.getElementById("ediInput");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const modeSelect = document.getElementById("mode");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const API_BASE = "http://localhost:3001";

/* ---------------- load templates ---------------- */

async function loadTemplates() {
  const res = await fetch(`${API_BASE}/api/templates`);
  const data = await res.json();

  templateSelect.innerHTML = `<option value="">Auto-detect</option>`;

  data.templates.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.id;
    templateSelect.appendChild(opt);
  });
}

loadTemplates();

/* ---------------- mode switching ---------------- */

function updateUI() {
  const mode = modeSelect.value;

  if (mode === "toJson") {
    ediInput.placeholder = "Paste EDI here or upload a file";
    copyBtn.textContent = "Copy JSON";
    downloadBtn.textContent = "Download JSON";
  } else {
    ediInput.placeholder = "Paste JSON here or upload a file";
    copyBtn.textContent = "Copy EDI";
    downloadBtn.textContent = "Download EDI";
  }
}

modeSelect.addEventListener("change", updateUI);
updateUI();

/* ---------------- load file ---------------- */

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    ediInput.value = reader.result;
  };

  reader.onerror = () => {
    alert("Failed to read file");
  };

  reader.readAsText(file);
});

/* ---------------- convert ---------------- */

document.getElementById("convertBtn").onclick = async () => {
  output.textContent = "Converting...";

  const mode = modeSelect.value;
  const inputText = ediInput.value;
  const type = templateSelect.value || undefined;

  try {
    if (mode === "toJson") {
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edi: inputText, type })
      });

      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    } else {
      const jsonData = JSON.parse(inputText);

      if (!type) {
        output.textContent = "Error: Please select a template type for JSON to EDI conversion";
        return;
      }

      const res = await fetch(`${API_BASE}/api/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: jsonData })
      });

      const result = await res.json();
      output.textContent = result.edi || JSON.stringify(result, null, 2);
    }
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
};

/* ---------------- copy ---------------- */

document.getElementById("copyBtn").onclick = async () => {
  await navigator.clipboard.writeText(output.textContent);
  alert("Copied!");
};

/* ---------------- download ---------------- */

document.getElementById("downloadBtn").onclick = () => {
  const mode = modeSelect.value;
  const filename = mode === "toJson" ? "output.json" : "output.edi";
  const mimeType = mode === "toJson" ? "application/json" : "text/plain";

  const blob = new Blob([output.textContent], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
};
