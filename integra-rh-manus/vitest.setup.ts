import "@testing-library/jest-dom/vitest";

// JSDOM doesn't provide these in all versions.
if (!globalThis.btoa) {
  globalThis.btoa = (str: string) => Buffer.from(str, "binary").toString("base64");
}

if (!globalThis.atob) {
  globalThis.atob = (b64: string) => Buffer.from(b64, "base64").toString("binary");
}
