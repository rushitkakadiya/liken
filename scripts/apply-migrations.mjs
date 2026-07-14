import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const projectRef = "mppturdnargakcqahhfj";
const password = process.env.SUPABASE_DB_PASSWORD;

if (!password) {
  console.error(
    "Missing SUPABASE_DB_PASSWORD in .env\n" +
      "Get it from: Supabase Dashboard → Project Settings → Database → Database password",
  );
  process.exit(1);
}

const migrationsDir = path.join(__dirname, "../supabase/migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
  }
  console.log("All migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
