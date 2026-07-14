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
      "Get it from: Supabase Dashboard → Project Settings → Database → Database password\n" +
      "Then run: npm run apply:saved-looks",
  );
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/004_saved_looks.sql"),
  "utf8",
);

const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Applying 004_saved_looks.sql...");
  await client.query(sql);
  console.log("saved_looks migration applied successfully.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
