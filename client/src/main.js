const templateSelect = document.getElementById("templateSelect");
const ediInput = document.getElementById("ediInput");
const output = document.getElementById("output");
const fileInput = document.getElementById("fileInput");

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

/* ---------------- handle file upload ---------------- */
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  ediInput.value = text;
});

/* ---------------- convert ---------------- */
document.getElementById("convertBtn").onclick = async () => {
  const edi = ediInput.value.trim();
  const type = templateSelect.value || undefined;

  if (!edi) {
    alert("Please paste or upload EDI content first");
    return;
  }

  output.textContent = "Converting...";

  try {
    const res = await fetch(`${API_BASE}/api/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edi, type })
    });

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = "Error: " + err.message;
  }
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
