import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "../../env";

const ALGORITHM = "aes-256-gcm";

export class TokenCipher {
  private readonly key = createHash("sha256").update(env.GARMIN_TOKEN_ENCRYPTION_KEY).digest();

  public encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${authTag.toString("base64url")}`;
  }

  public decrypt(ciphertext: string): string {
    const [ivPart, encryptedPart, authTagPart] = ciphertext.split(".");

    if (!ivPart || !encryptedPart || !authTagPart) {
      throw new Error("Invalid encrypted token payload");
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivPart, "base64url")
    );
    decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, "base64url")),
      decipher.final()
    ]);

    return decrypted.toString("utf8");
  }
}
