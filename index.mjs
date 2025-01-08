#!/usr/bin/env node
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { glob } from "glob";
import { encryptFile } from "./lib/file-encrypt.mjs";
import { decryptFile } from "./lib/file-decrypt.mjs";
import { encryptedFileExtension } from "./consts.mjs";
import { askPassword } from "./lib/helpers.mjs";

const { log: printLog, error: printError } = console;

const die = (...args) => {
  printError(...args);
  process.exit(1);
};

process.on("uncaughtException", die);
process.on("unhandledRejection", die);

const updateLog = (...args) => {
  process.stdout.write("\r" + args.join(" "));
};

const { version } = JSON.parse(await readFile(new URL("./package.json", import.meta.url)));
const usageInstructions = "Usage:\n\tnpx secfile <encrypt|decrypt|auto> <inputPattern> <password|ask> [delete] [overwrite] [move=new-path]";

printLog(`SecFile version: ${version}\n\n${usageInstructions}\n`);

let [executionMode, inputPattern, askPasswordOrInputPassword, ...flags] = process.argv.slice(2);
let password = askPasswordOrInputPassword;
let flagDelete = false;
let flagOverwrite = false;
let flagMove = false;

if (askPasswordOrInputPassword === "ask") {
  password = askPassword();

  if (!password) {
    die(`Password can't be empty`);
  }
}

if (!inputPattern || !executionMode || !password || !["encrypt", "enc", "decrypt", "dec", "auto"].includes(executionMode)) {
  die(usageInstructions);
}

const inputFiles = glob.sync(inputPattern, { nodir: true });

if (inputFiles.length === 0) {
  die(`Error: Input pattern "${inputPattern}" does not match any files`);
}

if (executionMode === "auto" && inputFiles.length > 1) {
  die("Error: execution mode 'auto' only can be set with just a single input file");
}

if (typeof password !== "string") {
  die("Error: Password must be a string");
}

if (flags.length > 0) {
  if (flags.includes("delete")) {
    flagDelete = true;
  }

  if (flags.includes("overwrite")) {
    flagOverwrite = true;
  }

  const moveFlags = flags.filter(item => item.startsWith("move="));

  if (moveFlags.length > 1) {
    die("Error: move flag should be specified only once");
  }

  if (moveFlags.length === 1) {
    const [moveFlagSpecification] = moveFlags;
    const { newPath } = moveFlagSpecification.match(/^move=(?<newPath>.*)$/).groups;
    flagMove = newPath;
  }
}

for (const inputFile of inputFiles) {
  if (!existsSync(inputFile)) {
    die(`Error: Input file "${inputFile}" does not exist`);
  }

  if (executionMode === "auto") {
    if (inputFile.endsWith(encryptedFileExtension)) {
      executionMode = "encrypt";
    } else {
      executionMode = "decrypt";
    }
  }

  if (executionMode.slice(0, 3) === "enc") {
    await encryptFile(inputFile, password, printLog, updateLog, { flagDelete, flagOverwrite, flagMove });
  } else if (executionMode.slice(0, 3) === "dec") {
    await decryptFile(inputFile, password, printLog, updateLog, { flagDelete, flagOverwrite, flagMove });
  }
}

printLog(`\n\nDone`);
