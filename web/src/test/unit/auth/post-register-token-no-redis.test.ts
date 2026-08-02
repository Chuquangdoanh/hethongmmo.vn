import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/redis", () => ({ redis: null }));

import { createPostRegisterToken, consumePostRegisterToken } from "@/lib/auth/post-register-token";

describe("post-register-token when Redis is unavailable", () => {
  it("createPostRegisterToken fails open by returning null", async () => {
    const token = await createPostRegisterToken("user@example.com");
    expect(token).toBeNull();
  });

  it("consumePostRegisterToken fails closed by returning false", async () => {
    const result = await consumePostRegisterToken("user@example.com", "any-token");
    expect(result).toBe(false);
  });
});
