import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./cli.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(__dirname, "..");

function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export function createConfig(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    return { argError: error.message };
  }

  const contentRoot = args.contentRoot ?? env("CONTENT_ROOT", "./content");

  return {
    help: args.help === true,
    port: args.port ?? Number.parseInt(env("PORT", "3000"), 10),
    host: env("HOST", "0.0.0.0"),
    contentRoot: path.resolve(APP_ROOT, contentRoot),
    singleFile: args.file ? path.resolve(process.cwd(), args.file) : null,
  };
}

export const config = createConfig();
