import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: false,
});

const defaultFence =
  md.renderer.rules.fence ||
  function fence(tokens, idx, options, env, slf) {
    return slf.renderToken(tokens, idx, options);
  };

const MARKDOWN_ESCAPES = /\\([\\`*_{}[\]()#+.!>~&-])/gu;

function decodeNumericEntity(_, hex, decimal) {
  const code = hex ? Number.parseInt(hex, 16) : Number(decimal);
  if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
    return _;
  }
  try {
    return String.fromCodePoint(code);
  } catch {
    return _;
  }
}

function separateInlineDirectionComment(source) {
  // `graph TD%% comment` is valid-looking GitHub example text, but Mermaid 11
  // requires a newline between the direction and the comment.
  return source.replace(/^((?:graph|flowchart)\s+(?:TD|TB|BT|LR|RL))\s*%%/imu, "$1\n%%");
}

function rewriteLegacyGitGraph(source) {
  if (!/^\s*gitGraph/iu.test(source)) {
    return source;
  }

  let next = source.replace(/^\s*gitGraph:\s*/iu, "gitGraph\n");
  next = next.replace(/\noptions\s*\{[\s\S]*?\}\s*end\s*/iu, "\n");
  if (!/\bbranch\s+master\b/iu.test(next)) {
    next = next.replace(/\b(checkout|switch|merge)\s+master\b/giu, "$1 main");
  }
  return next;
}

/**
 * Mermaid is picky about source text. Windows files often use CRLF, and copies
 * of GitHub examples frequently contain HTML entities, leftover Markdown
 * backslash-escapes, and pre-Mermaid-10 gitGraph syntax.
 */
export function normalizeMermaidSource(source) {
  const cleaned = source
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(MARKDOWN_ESCAPES, "$1")
    .replace(/&#x([0-9a-fA-F]+);/giu, (match, hex) => decodeNumericEntity(match, hex, undefined))
    .replace(/&#(\d+);/gu, (match, decimal) => decodeNumericEntity(match, undefined, decimal))
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&nbsp;", " ");
  return rewriteLegacyGitGraph(separateInlineDirectionComment(cleaned));
}

md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
  const info = tokens[idx].info.trim().split(/\s+/u)[0] || "";
  if (info === "mermaid") {
    const source = normalizeMermaidSource(tokens[idx].content).replace(/\n$/u, "");
    return `<pre class="mermaid">${md.utils.escapeHtml(source)}</pre>\n`;
  }
  return defaultFence(tokens, idx, options, env, slf);
};

export function renderMarkdown(markdown) {
  return md.render(markdown.replaceAll("\r\n", "\n").replaceAll("\r", "\n"));
}

export function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/mu);
  if (!match) {
    return fallback;
  }
  return match[1].trim();
}
