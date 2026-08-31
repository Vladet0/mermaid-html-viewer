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

md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
  const info = tokens[idx].info.trim().split(/\s+/u)[0] || "";
  if (info === "mermaid") {
    const source = tokens[idx].content.replace(/\n$/u, "");
    return `<pre class="mermaid">${md.utils.escapeHtml(source)}</pre>\n`;
  }
  return defaultFence(tokens, idx, options, env, slf);
};

export function renderMarkdown(markdown) {
  return md.render(markdown);
}

export function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/mu);
  if (!match) {
    return fallback;
  }
  return match[1].trim();
}
