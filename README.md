# Markdown Mermaid Viewer

Read-only internal viewer for Markdown files that contain Mermaid diagrams. Drop a `.md` file on the page and it renders like a GitHub Markdown preview, with fenced `mermaid` blocks drawn as diagrams.

Files stay where they are. The viewer stores nothing.

## Architecture

```text
Browser
   │  POST /render                              (file dropped on the page)
   │  GET  /docs/{repository}/{branch}/{path}   (optional local content/)
   ▼
Express app
   │
   ├─ markdown-it   → HTML (mermaid fences become <pre class="mermaid">)
   ├─ sanitize-html → strip unsafe tags and attributes
   └─ HTML page + mermaid.min.js
          ▼
      Browser renders diagrams
```

## Libraries

| Library | Why |
| --- | --- |
| **Express** | Small HTTP server, easy to containerize |
| **markdown-it** | Established CommonMark parser with tables, fences, and a custom fence renderer |
| **sanitize-html** | Treat Markdown as untrusted: HTML is sanitized before display |
| **mermaid** (official) | Client-side diagram rendering from fenced `mermaid` blocks |

No database. No editor. No accounts. No external services.

## Project structure

```text
content/                         Optional local Markdown, empty by default
  {repository}/{branch}/...
src/
  index.js                       Process entry
  app.js                         HTTP routes, static files, CSP
  cli.js                         Command line options
  config.js                      Environment + CLI configuration
  errors.js
  views.js                       Minimal HTML templates
  render/
    markdown.js                  markdown-it + mermaid fence handling
    sanitize.js                  HTML sanitizer
  sources/
    createSource.js              Source factory
    singleFileSource.js          Single file given on the command line
    localSource.js               Read files from the content directory
  public/
    css/document.css
    js/viewer.js                 Mermaid rendering + drag and drop preview
Dockerfile
.env.example
```

## Run locally

Requires Node.js 20+.

```bash
npm install
npm start
```

Open http://localhost:3000 and drop a Markdown file on the page.

## Drop a file on the page

This is the main way to view a document. Drag any `.md` file onto the viewer (the start page or an open document) and it renders in place, diagrams included. The start page also has a "choose a file" button for the same thing.

The file is read in the browser, posted to `POST /render`, sanitized on the server, and returned as HTML. Nothing is written to disk and nothing is stored; closing the preview or refreshing discards it. Files over 2 MB and non-Markdown extensions are rejected.

## View a single file from the terminal

Point the viewer at a Markdown file on disk. It is served at `/`:

```bash
node src/index.js ./architecture.md
node src/index.js --file ~/notes/system.md --port 4000
npm start -- --file ../some-repo/docs/overview.md
```

Paths are resolved from the current working directory. The file is re-read on every request, so saving it and refreshing the browser shows the latest version.

All options (`node src/index.js --help`):

```text
-f, --file <path>     Render a single Markdown file instead of the content directory
-c, --content <dir>   Serve a content directory (default: ./content)
-p, --port <port>     Port to listen on (default: 3000)
-h, --help            Show this help
```

## Serve a folder of Markdown

`content/` ships empty. Any Markdown placed under `content/{repository}/{branch}/...` is listed on the start page and served at the matching `/docs/...` URL.

Optional environment variables (see `.env.example`):

```text
PORT=3000
HOST=0.0.0.0
CONTENT_ROOT=./content
```

## Docker

```bash
docker build -t markdown-mermaid-viewer .
docker run --rm -p 3000:3000 markdown-mermaid-viewer
```

Mount a folder of documents if needed:

```bash
docker run --rm -p 3000:3000 -v "$PWD/content:/app/content" markdown-mermaid-viewer
```

Or render one mounted file:

```bash
docker run --rm -p 3000:3000 -v "$PWD/architecture.md:/doc.md:ro" \
  markdown-mermaid-viewer node src/index.js --file /doc.md
```

## Security

- Raw HTML in Markdown is not interpreted (`html: false`)
- Generated HTML is sanitized; `script` and event handlers are not allowed
- Mermaid runs with `securityLevel: "strict"`
- CSP disallows inline scripts and cross-origin connections
- Dropped files are sanitized like any other content, never stored, and capped at 2 MB
- Path traversal outside `CONTENT_ROOT` is rejected and only `.md` files are served
- There is no server-side file browser, so the host filesystem is not exposed
- The application makes no outbound network requests
