const MARKDOWN_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkd", ".txt"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const main = document.getElementById("viewer-main");
const overlay = document.getElementById("drop-overlay");
const pathLabel = document.getElementById("chrome-path");
const closeButton = document.getElementById("close-preview");

let mermaidLoader = null;
let dragDepth = 0;

function mermaidConfig() {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "neutral",
    suppressErrorRendering: false,
    flowchart: { htmlLabels: true, useMaxWidth: true },
    sequence: { useMaxWidth: true },
    gantt: { useMaxWidth: true },
  };
}

function loadMermaid() {
  if (window.mermaid) {
    return Promise.resolve(window.mermaid);
  }
  if (!mermaidLoader) {
    mermaidLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/mermaid.min.js";
      script.onload = () => {
        window.mermaid.initialize(mermaidConfig());
        resolve(window.mermaid);
      };
      script.onerror = () => reject(new Error("Could not load the Mermaid library"));
      document.head.appendChild(script);
    });
  }
  return mermaidLoader;
}

async function renderDiagrams() {
  const nodes = [...document.querySelectorAll("pre.mermaid:not([data-processed])")];
  if (nodes.length === 0) {
    return;
  }
  const mermaid = await loadMermaid();
  try {
    await mermaid.run({ nodes, suppressErrors: true });
  } catch (error) {
    console.error("Mermaid rendering failed", error);
  }

  const leftover = [...document.querySelectorAll("pre.mermaid:not([data-processed])")];
  for (const node of leftover) {
    try {
      await mermaid.run({ nodes: [node], suppressErrors: true });
    } catch (error) {
      console.error("Mermaid diagram failed", error);
      node.setAttribute("data-processed", "true");
      node.classList.add("mermaid-failed");
    }
  }
}

function setStatus(text) {
  if (pathLabel) {
    pathLabel.textContent = text;
  }
}

function isMarkdownFile(file) {
  const name = (file.name || "").toLowerCase();
  return MARKDOWN_EXTENSIONS.some((extension) => name.endsWith(extension));
}

async function requestRender(markdown) {
  const response = await fetch("/render", {
    method: "POST",
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
    body: markdown,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Preview failed (${response.status})`);
  }
  return payload;
}

async function previewFile(file) {
  if (!isMarkdownFile(file)) {
    setStatus(`${file.name} is not a Markdown file`);
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    setStatus(`${file.name} is too large to preview (limit 2 MB)`);
    return;
  }

  setStatus(`Rendering ${file.name}…`);
  try {
    const markdown = await file.text();
    const { title, html } = await requestRender(markdown);
    showPreview({ title: title || file.name, label: file.name, html });
  } catch (error) {
    setStatus(`Could not preview ${file.name}: ${error.message}`);
  }
}

function showPreview({ title, label, html }) {
  document.title = title;
  // The server sanitizes this HTML before it is returned.
  main.innerHTML = `<article class="markdown-body">${html}</article>`;
  setStatus(`${label} — local preview, not saved`);
  if (closeButton) {
    closeButton.hidden = false;
  }
  window.scrollTo(0, 0);
  renderDiagrams().catch((error) => {
    setStatus(`${label} — diagrams could not be rendered: ${error.message}`);
  });
}

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
}

function showOverlay(visible) {
  if (overlay) {
    overlay.hidden = !visible;
  }
}

window.addEventListener("dragenter", (event) => {
  if (!hasFiles(event)) {
    return;
  }
  event.preventDefault();
  dragDepth += 1;
  showOverlay(true);
});

window.addEventListener("dragover", (event) => {
  if (hasFiles(event)) {
    event.preventDefault();
  }
});

window.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    showOverlay(false);
  }
});

window.addEventListener("drop", (event) => {
  if (!hasFiles(event)) {
    return;
  }
  event.preventDefault();
  dragDepth = 0;
  showOverlay(false);
  const file = event.dataTransfer.files[0];
  if (file) {
    previewFile(file);
  }
});

const filePicker = document.getElementById("file-picker");
const fileInput = document.getElementById("file-input");
if (filePicker && fileInput) {
  filePicker.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) {
      previewFile(fileInput.files[0]);
    }
    fileInput.value = "";
  });
}

if (closeButton) {
  closeButton.addEventListener("click", () => window.location.reload());
}

document.addEventListener("DOMContentLoaded", () => {
  renderDiagrams().catch((error) => {
    console.error("Mermaid rendering failed", error);
  });
});
