import { AppError } from "./errors.js";

export const USAGE = `Markdown viewer (read-only)

Usage:
  node src/index.js [options] [file.md]

Options:
  -f, --file <path>   Render a single Markdown file instead of the content directory
  -c, --content <dir> Serve a content directory (default: ./content)
  -p, --port <port>   Port to listen on (default: 3000)
  -h, --help          Show this help

Examples:
  node src/index.js
  node src/index.js ./architecture.md
  node src/index.js --file ~/notes/system.md --port 4000
  npm start -- --file ./architecture.md
`;

function takeValue(name, inline, rest) {
  const value = inline ?? rest.shift();
  if (value === undefined || value.startsWith("-")) {
    throw new AppError(400, `Option ${name} requires a value`);
  }
  return value;
}

export function parseArgs(argv) {
  const options = {};
  const rest = [...argv];

  while (rest.length > 0) {
    const arg = rest.shift();
    const [flag, inline] = arg.startsWith("--") ? splitInline(arg) : [arg, undefined];

    switch (flag) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-f":
      case "--file":
        options.file = takeValue(flag, inline, rest);
        break;
      case "-c":
      case "--content":
        options.contentRoot = takeValue(flag, inline, rest);
        break;
      case "-p":
      case "--port":
        options.port = Number.parseInt(takeValue(flag, inline, rest), 10);
        if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
          throw new AppError(400, "Option --port requires a number between 1 and 65535");
        }
        break;
      default:
        if (flag.startsWith("-")) {
          throw new AppError(400, `Unknown option: ${flag}`);
        }
        if (options.file) {
          throw new AppError(400, "Only one Markdown file can be given");
        }
        options.file = flag;
    }
  }

  return options;
}

function splitInline(arg) {
  const index = arg.indexOf("=");
  return index === -1 ? [arg, undefined] : [arg.slice(0, index), arg.slice(index + 1)];
}
