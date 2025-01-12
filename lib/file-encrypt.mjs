import { statSync, existsSync, createReadStream, createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { basename, dirname, resolve, join, extname, sep as pathSeparator } from "path";
import { createDeflate } from "zlib";
import { encryptedFileExtension } from "../consts.mjs";
import { EncryptStream } from "./encrypt-stream.mjs";
import { formatDate } from "./helpers.mjs";
import { unlink, mkdir } from "fs/promises";

export const encryptFile = async (inputFile, password, printProgressCallBack, updateProgressCallBack, { flagDelete, flagOverwrite, flagMove }) => {
  const inputFileAbsolutePath = resolve(inputFile);
  const inputFileStats = statSync(inputFileAbsolutePath);
  const inputFileTotalBytes = inputFileStats.size;
  const inputFileModifiedDate = formatDate(inputFileStats.mtime);
  const inputFileCreatedDate = formatDate(inputFileStats.birthtime);
  const inputBaseFileName = basename(inputFileAbsolutePath);
  const inputFileNameExtension = extname(inputFileAbsolutePath).slice(1);
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

  let outputFileName = join(outputDir, ...middlePaths, `MCF.${inputFileModifiedDate}.${inputFileCreatedDate}.${inputBaseFileName}.${encryptedFileExtension}`);

  if (outputFileName.length > 255) {
    outputFileName = join(outputDir, ...middlePaths, `MF.${inputFileModifiedDate}.${inputBaseFileName}.${encryptedFileExtension}`);

    if (outputFileName.length > 255) {
      outputFileName = join(outputDir, ...middlePaths, `${inputBaseFileName}.${encryptedFileExtension}`);

      if (outputFileName.length > 255) {
        const truncatedBaseFileName = inputBaseFileName.slice(0, 255 - inputFileNameExtension.length - encryptedFileExtension.length - 2);
        outputFileName = join(outputDir, ...middlePaths, `${truncatedBaseFileName}.${inputFileNameExtension}.${encryptedFileExtension}`);
      }
    }
  }

  if (existsSync(outputFileName) && flagOverwrite === false) {
    console.error(`Error: The output file ${outputFileName} already exists`);
    process.exit(1);
  }

  const thisFileProgressCallBack = (...args) => {
    updateProgressCallBack(inputBaseFileName, ...args);
  };

  const inputStream = createReadStream(inputFileAbsolutePath);
  const compressStream = createDeflate();
  const encryptStream = new EncryptStream({ password, inputFileTotalBytes, progressCallBack: thisFileProgressCallBack });

  const outputBaseDirectory = dirname(outputFileName);
  await mkdir(outputBaseDirectory, { recursive: true });
  const outputStream = createWriteStream(outputFileName);

  printProgressCallBack(`\n\nEncrypting file: ${inputBaseFileName}.${inputFileNameExtension}`);

  await pipeline(inputStream, compressStream, encryptStream, outputStream);

  if (flagDelete) {
    await unlink(inputFileAbsolutePath);
  }
};
