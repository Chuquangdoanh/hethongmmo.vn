import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

// Prisma CLI không tự load .env khi có config file — load thủ công
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
