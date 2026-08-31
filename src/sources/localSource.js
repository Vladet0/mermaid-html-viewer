import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors.js";

function assertSafeSegment(segment, label) {
  if (!segment || segment === "." || segment === ".." || segment.includes("\0")) {
    throw new AppError(400, `Invalid ${label}`);
  }
}

function resolveInsideRoot(root, ...parts) {
  const resolved = path.resolve(root, ...parts);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep)) {
    throw new AppError(400, "Invalid path");
  }
  return resolved;
}

export class LocalMarkdownSource {
  constructor(contentRoot) {
    this.contentRoot = contentRoot;
  }

  async get({ repository, branch, filePath }) {
    assertSafeSegment(repository, "repository");
    assertSafeSegment(branch, "branch");

    const segments = filePath.split("/").filter(Boolean);
    if (segments.length === 0) {
      throw new AppError(400, "File path is required");
    }
    for (const segment of segments) {
      assertSafeSegment(segment, "file path");
    }

    const absolutePath = resolveInsideRoot(
      this.contentRoot,
      repository,
      branch,
      ...segments,
    );

    if (path.extname(absolutePath).toLowerCase() !== ".md") {
      throw new AppError(400, "Only Markdown (.md) files can be viewed");
    }

    try {
      const markdown = await fs.readFile(absolutePath, "utf8");
      return { markdown, location: absolutePath };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        throw new AppError(404, "Markdown file not found");
      }
      throw error;
    }
  }

  async list() {
    const files = [];
    await walk(this.contentRoot, this.contentRoot, files);
    return files.sort((a, b) => a.href.localeCompare(b.href));
  }
}

async function walk(root, current, files) {
  let entries;
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const absolutePath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolutePath, files);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const relative = path.relative(root, absolutePath).split(path.sep);
    if (relative.length < 3) {
      continue;
    }

    const [repository, branch, ...rest] = relative;
    const filePath = rest.join("/");
    files.push({
      repository,
      branch,
      filePath,
      href: `/docs/${encodeURIComponent(repository)}/${encodeURIComponent(branch)}/${filePath
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    });
  }
}
