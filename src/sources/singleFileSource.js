import fs from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors.js";

/**
 * Serves one Markdown file chosen on the command line.
 *
 * The file is read per request, so saving the file and refreshing the browser
 * shows the current content.
 */
export class SingleFileMarkdownSource {
  constructor(absolutePath) {
    this.absolutePath = absolutePath;
  }

  async get() {
    try {
      const markdown = await fs.readFile(this.absolutePath, "utf8");
      return { markdown, location: this.absolutePath };
    } catch (error) {
      if (error && (error.code === "ENOENT" || error.code === "EISDIR")) {
        throw new AppError(404, `Markdown file not found: ${this.absolutePath}`);
      }
      if (error && error.code === "EACCES") {
        throw new AppError(403, `Markdown file is not readable: ${this.absolutePath}`);
      }
      throw error;
    }
  }

  async list() {
    return [
      {
        repository: path.dirname(this.absolutePath),
        branch: "",
        filePath: path.basename(this.absolutePath),
        href: "/",
      },
    ];
  }
}
