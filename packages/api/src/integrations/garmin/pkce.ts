import { createHash, randomBytes } from "node:crypto";

export const createPkcePair = () => {
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const state = randomBytes(32).toString("base64url");

  return {
    state,
    codeVerifier,
    codeChallenge
  };
};
