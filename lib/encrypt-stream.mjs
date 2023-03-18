import { Transform } from "stream";
import { scryptSync, randomBytes, createCipheriv} from "crypto";

export class EncryptStream extends Transform {
  constructor({ password, totalBytes, progressCallBack, options }) {
    super({ ...options });
    this.algorithm = "aes-256-cbc";
    this.password = password;
    this.iv = randomBytes(16);
    this.key = scryptSync(password, this.iv, 32);
    this.cipher = createCipheriv(this.algorithm, this.key, this.iv);
    this.firstChunk = true;
    this.totalBytes = totalBytes;
    this.processedBytes = 0;
    this.progressCallBack = progressCallBack;
  }

  _transform(chunk, encoding, callback) {
    try {
      if (this.firstChunk) {
        this.push(this.iv);
        this.firstChunk = false;
      }

      const encryptedChunk = this.cipher.update(chunk);
      this.push(encryptedChunk);
      this.processedBytes += chunk.length;

      const progress = Math.round((this.processedBytes / this.totalBytes) * 100);
      this.progressCallBack(`Progress: ${progress <= 100 ? progress : '?'}%`);

      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }

  _flush(callback) {
    try {
      const encryptedFinal = this.cipher.final();
      this.push(encryptedFinal);

      this.progressCallBack("Encryption flush!");
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }

  _final(callback) {
    try {
      this.progressCallBack("Encryption finished!");
      callback();
    } catch (error) {
      debugger;
      console.error(error);
      process.exit(error.code || 1);
    }
  }
}
