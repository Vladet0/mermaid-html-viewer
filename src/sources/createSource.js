import { LocalMarkdownSource } from "./localSource.js";
import { SingleFileMarkdownSource } from "./singleFileSource.js";

export function createMarkdownSource(config) {
  return config.singleFile
    ? new SingleFileMarkdownSource(config.singleFile)
    : new LocalMarkdownSource(config.contentRoot);
}
