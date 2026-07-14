import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const projectRef = "mppturdnargakcqahhfj";
const url = process.env.VITE_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();

const secrets = [
  { key: "gemini_api_key", value: process.env.GEMINI_API_KEY?.trim() },
  { key: "dataforseo_login", value: process.env.DATAFORSEO_LOGIN?.trim() },
  { key: "dataforseo_password", value: process.env.DATAFORSEO_PASSWORD?.trim() },
  { key: "fal_key", value: process.env.FAL_KEY?.trim() },
  { key: "stripe_secret_key", value: process.env.STRIPE_SECRET_KEY?.trim() },
  { key: "stripe_publishable_key", value: process.env.STRIPE_PUBLISHABLE_KEY?.trim() },
  { key: "stripe_webhook_secret", value: process.env.STRIPE_WEBHOOK_SECRET?.trim() },
].filter((entry) => entry.value);

if (secrets.length === 0) {
  console.error("No API keys found in .env to seed.");
  process.exit(1);
}

async function seedWithServiceRole() {
  if (!url || !serviceRoleKey) return false;

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const secret of secrets) {
    const { error } = await supabase.from("app_secrets").upsert({
      key: secret.key,
      value: secret.value,
    });
    if (error) throw error;
  }

  return true;
}

async function seedWithPg() {
  if (!dbPassword) return false;

  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    for (const secret of secrets) {
      await client.query(
        `insert into public.app_secrets (key, value)
         values ($1, $2)
         on conflict (key) do update
         set value = excluded.value, updated_at = now()`,
        [secret.key, secret.value],
      );
    }
  } finally {
    await client.end();
  }

  return true;
}

try {
  let seeded = false;

  if (serviceRoleKey) {
    seeded = await seedWithServiceRole();
    if (seeded) console.log("Seeded app secrets via Supabase service role.");
  }

  if (!seeded && dbPassword) {
    seeded = await seedWithPg();
    if (seeded) console.log("Seeded app secrets via direct database connection.");
  }

  if (!seeded) {
    console.error(
      "Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD to .env, then run again.",
    );
    process.exit(1);
  }

  console.log(`Stored ${secrets.length} secrets in Supabase.`);
} catch (err) {
  console.error("Secret seeding failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
