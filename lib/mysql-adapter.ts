import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export function mysqlOptions(connectionString: string) {
  const url = new URL(connectionString);
  if (url.protocol !== "mysql:") throw new Error("Gunakan DATABASE_URL MySQL.");
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectionLimit: 5,
    connectTimeout: 10000,
    acquireTimeout: 15000,
    timezone: "+00:00",
    ...(url.searchParams.get("ssl") === "true" ||
    url.searchParams.get("sslaccept") === "strict"
      ? { ssl: { rejectUnauthorized: true } }
      : {}),
  };
}
export function mysqlAdapter(connectionString: string) {
  return new PrismaMariaDb(mysqlOptions(connectionString));
}
