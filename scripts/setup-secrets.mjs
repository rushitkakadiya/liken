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
  console.error("Missing SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/003_app_secrets.sql"),
  "utf8",
);

const secrets = [
  { key: "gemini_api_key", value: process.env.GEMINI_API_KEY?.trim() },
  { key: "dataforseo_login", value: process.env.DATAFORSEO_LOGIN?.trim() },
  { key: "dataforseo_password", value: process.env.DATAFORSEO_PASSWORD?.trim() },
  { key: "fal_key", value: process.env.FAL_KEY?.trim() },
].filter((entry) => entry.value);

const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Applying app_secrets migration...");
  await client.query(sql);

  for (const secret of secrets) {
    await client.query(
      `insert into public.app_secrets (key, value)
       values ($1, $2)
       on conflict (key) do update
       set value = excluded.value, updated_at = now()`,
      [secret.key, secret.value],
    );
  }

  console.log(`Stored ${secrets.length} API secrets in Supabase.`);
} catch (err) {
  console.error("Setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
