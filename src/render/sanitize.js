import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "em",
  "strong",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "del",
  "s",
  "sup",
  "sub",
];

export function sanitizeRenderedHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title"],
      th: ["align"],
      td: ["align"],
      code: ["class"],
      pre: ["class"],
    },
    allowedClasses: {
      pre: ["mermaid"],
      code: [/^language-[a-zA-Z0-9_+-]+$/u],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: "nofollow noopener noreferrer",
        },
      }),
    },
  });
}
