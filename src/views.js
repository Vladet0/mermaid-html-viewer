import { escapeHtml } from "./html.js";

// title and pathLabel must already be HTML-escaped by the caller.
function layout({ title, body, pathLabel = "", scripts = "" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/css/document.css">
</head>
<body>
  <header class="chrome">
    <a class="chrome-brand" href="/">Markdown viewer</a>
    <p class="chrome-path" id="chrome-path">${pathLabel}</p>
    <button type="button" class="chrome-action" id="close-preview" hidden>Close preview</button>
  </header>
  <main id="viewer-main">
    ${body}
  </main>
  <div class="drop-overlay" id="drop-overlay" hidden>
    <p>Drop a Markdown file to preview it</p>
  </div>
  ${scripts}
  <script src="/js/viewer.js"></script>
</body>
</html>`;
}

export function renderDocumentPage({ title, pathLabel, html }) {
  return layout({
    // title and pathLabel are escaped by the caller.
    title,
    pathLabel,
    body: `<article class="markdown-body">${html}</article>`,
    scripts: `<script src="/vendor/mermaid.min.js"></script>`,
  });
}

export function renderIndexPage(files) {
  const documents =
    files.length === 0
      ? ""
      : `<section class="documents">
    <h2>Documents in <code>content/</code></h2>
    <ul class="file-list">${files
      .map(
        (file) =>
          `<li><a href="${escapeHtml(file.href)}"><strong>${escapeHtml(
            file.filePath,
          )}</strong><span>${escapeHtml(file.repository)} / ${escapeHtml(
            file.branch,
          )}</span></a></li>`,
      )
      .join("")}</ul>
  </section>`;

  return layout({
    title: escapeHtml("Markdown viewer"),
    body: `<section class="splash">
  <h1>Markdown viewer</h1>
  <p class="splash-lead">Markdown rendered as HTML, with <code>mermaid</code> blocks drawn as diagrams.</p>
  <section class="dropzone" id="dropzone">
    <p class="dropzone-title">Drop a Markdown file here</p>
    <p class="dropzone-hint">or <button type="button" id="file-picker">choose a file</button></p>
    <input type="file" id="file-input" accept=".md,.markdown,.mdown,.mkd,text/markdown,text/plain" hidden>
  </section>
  <p class="splash-note">Read-only. Files are rendered by this server, never stored, and never leave it.</p>
  ${documents}
</section>`,
  });
}

export function renderErrorPage({ status, message }) {
  return layout({
    title: escapeHtml(`Error ${status}`),
    body: `<article class="markdown-body">
  <h1>Error ${escapeHtml(status)}</h1>
  <p>${escapeHtml(message)}</p>
  <p><a href="/">Back to document list</a></p>
</article>`,
  });
}
