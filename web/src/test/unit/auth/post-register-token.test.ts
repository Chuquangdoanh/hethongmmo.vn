import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

vi.mock("@/lib/db/redis", () => ({
  redis: {
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
    }),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

import { createPostRegisterToken, consumePostRegisterToken } from "@/lib/auth/post-register-token";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("createPostRegisterToken / consumePostRegisterToken", () => {
  it("creates a token that can be consumed exactly once", async () => {
    const token = await createPostRegisterToken("user@example.com");
    expect(token).toBeTruthy();

    const firstConsume = await consumePostRegisterToken("user@example.com", token!);
    expect(firstConsume).toBe(true);

    const secondConsume = await consumePostRegisterToken("user@example.com", token!);
    expect(secondConsume).toBe(false);
  });

  it("rejects a wrong token", async () => {
    await createPostRegisterToken("user@example.com");
    const result = await consumePostRegisterToken("user@example.com", "wrong-token");
    expect(result).toBe(false);
  });

  it("rejects a token issued for a different email", async () => {
    const token = await createPostRegisterToken("a@example.com");
    const result = await consumePostRegisterToken("b@example.com", token!);
    expect(result).toBe(false);
  });

  it("rejects consuming when no token was ever created", async () => {
    const result = await consumePostRegisterToken("nobody@example.com", "anything");
    expect(result).toBe(false);
  });
});
