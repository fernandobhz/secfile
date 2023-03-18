import { Transform } from "stream";
import { scryptSync, createDecipheriv } from "crypto";

export class DecryptStream extends Transform {
  constructor({ password, totalBytes, progressCallBack, options }) {
    super({ ...options });
    this.password = password;
    this.algorithm = "aes-256-cbc";
    this.key = null;
    this.iv = null;
    this.firstChunk = true;
    this.decipher = null;
    this.processedBytes = 0;
    this.totalBytes = totalBytes;
    this.progressCallBack = progressCallBack;
  }

  _transform(chunk, encoding, callback) {
    try {
      if (this.firstChunk) {
        this.iv = chunk.slice(0, 16);
        this.key = scryptSync(this.password, this.iv, 32);
        chunk = chunk.slice(16);
        this.decipher = createDecipheriv(this.algorithm, this.key, this.iv);
        this.firstChunk = false;
      }

      const decryptedChunk = this.decipher.update(chunk);
      this.processedBytes += chunk.length;

      const progress = Math.round((this.processedBytes / this.totalBytes) * 100);
      this.push(decryptedChunk);

      this.progressCallBack(`Progress: ${progress}%`);
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }

  _flush(callback) {
    try {
      const decryptedFinal = this.decipher.final();
      this.push(decryptedFinal);

      this.progressCallBack("Decryption flush!");
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }

  _final(callback) {
    try {
      this.progressCallBack("Decryption finished!");
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }
}
