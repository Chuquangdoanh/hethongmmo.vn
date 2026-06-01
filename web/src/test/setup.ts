import { vi } from "vitest";

// AES-256-GCM test key (64 hex chars = 32 bytes)
process.env.ENCRYPTION_KEY = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
process.env.AUTH_SECRET = "test-auth-secret-32-bytes-minimum!!";
process.env.SEPAY_WEBHOOK_SECRET = "test-sepay-secret";

// Suppress logger output during tests
vi.mock("@/lib/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
