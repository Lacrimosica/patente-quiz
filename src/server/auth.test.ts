import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./auth.js";

describe("password hashing", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Tr0ub4dour", hash)).toBe(false);
  });

  it("produces a distinct hash each time (random salt)", async () => {
    const a = await hashPassword("same password");
    const b = await hashPassword("same password");
    expect(a).not.toBe(b);
    // ...but both still verify.
    expect(await verifyPassword("same password", a)).toBe(true);
    expect(await verifyPassword("same password", b)).toBe(true);
  });

  it("returns false for a malformed hash instead of throwing", async () => {
    expect(await verifyPassword("whatever", "not-a-valid-hash")).toBe(false);
  });
});
