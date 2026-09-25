import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/mysql-migrations", seed: "tsx prisma/seed.ts" },
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "mysql://localhost:3306/teras_sb85",
  },
});
