const templateSelect = document.getElementById("templateSelect");
const ediInput = document.getElementById("ediInput");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");

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

  const edi = ediInput.value;
  const type = templateSelect.value || undefined;

  const res = await fetch(`${API_BASE}/api/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edi, type })
  });

  const data = await res.json();
  output.textContent = JSON.stringify(data, null, 2);
};

/* ---------------- copy ---------------- */

document.getElementById("copyBtn").onclick = async () => {
  await navigator.clipboard.writeText(output.textContent);
  alert("Copied!");
};

/* ---------------- download ---------------- */

document.getElementById("downloadBtn").onclick = () => {
  const blob = new Blob([output.textContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "edi.json";
  a.click();

  URL.revokeObjectURL(url);
};
