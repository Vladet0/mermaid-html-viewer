import express from "express";
import path from "node:path";
import { APP_ROOT, config } from "./config.js";
import { AppError } from "./errors.js";
import { extractTitle, renderMarkdown } from "./render/markdown.js";
import { sanitizeRenderedHtml } from "./render/sanitize.js";
import { createMarkdownSource } from "./sources/createSource.js";
import { renderDocumentPage, renderErrorPage, renderIndexPage } from "./views.js";

const mermaidDist = path.join(APP_ROOT, "node_modules/mermaid/dist/mermaid.min.js");
const MAX_DROPPED_FILE_SIZE = "2mb";

function setSecurityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  next();
}

function sendDocument(res, { markdown, fallbackTitle, pathLabel }) {
  const html = sanitizeRenderedHtml(renderMarkdown(markdown));
  res.type("html").send(
    renderDocumentPage({
      title: extractTitle(markdown, fallbackTitle),
      pathLabel,
      html,
    }),
  );
}

export function createApp(appConfig = config) {
  const source = createMarkdownSource(appConfig);
  const app = express();
  app.disable("x-powered-by");
  app.use(setSecurityHeaders);
  app.use("/css", express.static(path.join(APP_ROOT, "src/public/css"), { index: false }));
  app.use("/js", express.static(path.join(APP_ROOT, "src/public/js"), { index: false }));
  app.get("/vendor/mermaid.min.js", (_req, res) => {
    res.type("application/javascript");
    res.sendFile(mermaidDist);
  });

  if (appConfig.singleFile) {
    const fileName = path.basename(appConfig.singleFile);
    app.get("/", async (_req, res, next) => {
      try {
        const { markdown } = await source.get();
        sendDocument(res, {
          markdown,
          fallbackTitle: fileName,
          pathLabel: appConfig.singleFile,
        });
      } catch (error) {
        next(error);
      }
    });
  } else {
    app.get("/", async (_req, res, next) => {
      try {
        const files = await source.list();
        res.type("html").send(renderIndexPage(files));
      } catch (error) {
        next(error);
      }
    });

    app.get("/docs/:repository/:branch/*", async (req, res, next) => {
      try {
        const filePath = req.params[0];
        const { repository, branch } = req.params;
        const { markdown } = await source.get({ repository, branch, filePath });
        sendDocument(res, {
          markdown,
          fallbackTitle: filePath,
          pathLabel: `${repository} / ${branch} / ${filePath}`,
        });
      } catch (error) {
        next(error);
      }
    });
  }

  app.post(
    "/render",
    express.text({ type: "*/*", limit: MAX_DROPPED_FILE_SIZE }),
    (req, res, next) => {
      try {
        const markdown = typeof req.body === "string" ? req.body : "";
        if (markdown.trim() === "") {
          throw new AppError(400, "No Markdown content received");
        }
        res.json({
          title: extractTitle(markdown, ""),
          html: sanitizeRenderedHtml(renderMarkdown(markdown)),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.use((_req, res) => {
    res.status(404).type("html").send(renderErrorPage({ status: 404, message: "Page not found" }));
  });

  app.use((error, req, res, _next) => {
    const tooLarge = error.type === "entity.too.large";
    const expected = tooLarge || error instanceof AppError;
    const status = tooLarge ? 413 : error instanceof AppError ? error.status : 500;
    const message = tooLarge
      ? `File is too large to preview (limit ${MAX_DROPPED_FILE_SIZE})`
      : expected
        ? error.message
        : "An unexpected error occurred while rendering this document.";
    if (!expected) {
      console.error(error);
    }
    if (req.path === "/render") {
      res.status(status).json({ error: message });
      return;
    }
    res.status(status).type("html").send(renderErrorPage({ status, message }));
  });

  return app;
}
