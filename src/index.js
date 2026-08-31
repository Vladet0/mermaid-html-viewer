import fs from "node:fs";
import { createApp } from "./app.js";
import { USAGE } from "./cli.js";
import { config } from "./config.js";

if (config.argError) {
  console.error(`${config.argError}\n`);
  console.error(USAGE);
  process.exit(2);
}

if (config.help) {
  console.log(USAGE);
  process.exit(0);
}

if (config.singleFile && !fs.existsSync(config.singleFile)) {
  console.error(`File not found: ${config.singleFile}`);
  process.exit(1);
}

const app = createApp(config);

const server = app.listen(config.port, config.host, () => {
  const url = `http://localhost:${config.port}`;
  if (config.singleFile) {
    console.log(`Markdown viewer serving ${config.singleFile}`);
    console.log(`Open ${url}`);
  } else {
    console.log(`Markdown viewer listening on ${url}`);
    console.log(`Content root: ${config.contentRoot}`);
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Try --port <other port>.`);
    process.exit(1);
  }
  throw error;
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
