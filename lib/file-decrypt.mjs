import { utimesSync, createReadStream, createWriteStream, existsSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { unlink, mkdir } from 'fs/promises';
import { resolve, basename, dirname, extname, sep as pathSeparator  } from 'path';
import { createInflate } from "zlib";
import { DecryptStream } from "./decrypt-stream.mjs";
import { parseDate} from './helpers.mjs';

export const decryptFile = async (inputFile, password, printProgressCallBack, updateProgressCallBack, {flagDelete, flagOverwrite, flagMove}) => {
  const inputFileStats = statSync(inputFile);
  const inputFileTotalBytes = inputFileStats.size - 16;
  const inputFileAbsolutePath = resolve(inputFile);
  const inputBaseFileName = basename(inputFileAbsolutePath);
  const inputFileNameExtension = extname(inputFileAbsolutePath).slice(1);
  const inputFileParts = inputBaseFileName.split(".");
  const encryptedFileNamePattern = inputFileParts[0];

  let modifiedDateString;
  let createdDateString;
  let originalFileNameWithExtension;

  if (encryptedFileNamePattern === "MCF") {
    modifiedDateString = inputFileParts.at(1);
    createdDateString = inputFileParts.at(2);
    originalFileNameWithExtension = inputFileParts.slice(3, inputFileParts.length - 1).join(".");
  } else if (encryptedFileNamePattern === "MF") {
    modifiedDateString = inputFileParts.at(1);
    originalFileNameWithExtension = inputFileParts.slice(2, inputFileParts.length - 1).join(".");
  } else {
    originalFileNameWithExtension = inputFileParts.slice(0, inputFileParts.length - 1).join(".");
  }

  const modifiedDate = modifiedDateString ? parseDate(modifiedDateString) : undefined;
  const createdDate = createdDateString ? parseDate(createdDateString) : undefined;

  let outputDir = dirname(inputFileAbsolutePath);
  let middlePaths = [];

  if (flagMove) {
    outputDir = resolve(flagMove);

    const inputFilePaths = inputFileAbsolutePath.split(pathSeparator);
    const outputDirPaths = outputDir.split(pathSeparator);

    middlePaths = inputFilePaths
      .slice(0, -1)
      .filter((pathValue, pathIndex) => outputDirPaths.at(pathIndex) !== pathValue)
      .map(pathValue => pathValue.replace(":", ""));
  }
  
  const outputFileName = resolve(outputDir, ...middlePaths, originalFileNameWithExtension);

  if (existsSync(outputFileName) && flagOverwrite === false) {
    console.error(`Error: The output file ${outputFileName} already exists`);
    process.exit(1);
  }
  
  const thisFileProgressCallBack = (...args) => {
    updateProgressCallBack(inputBaseFileName, ...args);
  }

  const inputStream = createReadStream(inputFileAbsolutePath);
  const decryptStream = new DecryptStream({ password, inputFileTotalBytes, progressCallBack: thisFileProgressCallBack });
  const decompressStream = createInflate();
  
  const outputBaseDirectory = dirname(outputFileName);
  await mkdir(outputBaseDirectory, { recursive: true });
  const outputStream = createWriteStream(outputFileName);

  printProgressCallBack(`\n\nDecrypting file: ${inputBaseFileName}.${inputFileNameExtension}`);
  
  await pipeline(inputStream, decryptStream, decompressStream, outputStream);

  if (createdDate) {
    utimesSync(outputFileName, createdDate, modifiedDate);
  } else if (modifiedDate) {
    utimesSync(outputFileName, modifiedDate, modifiedDate);
  }

  if (flagDelete) {
    await unlink(inputFile)
  }
};
