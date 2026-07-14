import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env") });

const migration = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/003_app_secrets.sql"),
  "utf8",
);

const secrets = [
  { key: "gemini_api_key", value: process.env.GEMINI_API_KEY?.trim() },
  { key: "dataforseo_login", value: process.env.DATAFORSEO_LOGIN?.trim() },
  { key: "dataforseo_password", value: process.env.DATAFORSEO_PASSWORD?.trim() },
  { key: "fal_key", value: process.env.FAL_KEY?.trim() },
].filter((entry) => entry.value);

const inserts = secrets
  .map(
    (entry) =>
      `insert into public.app_secrets (key, value) values ('${entry.key}', '${entry.value.replace(/'/g, "''")}')\n` +
      `on conflict (key) do update set value = excluded.value, updated_at = now();`,
  )
  .join("\n\n");

const output = `${migration}\n\n-- Seed API secrets (generated locally — do not commit)\n${inserts}\n`;

const outPath = path.join(__dirname, "../supabase/.local-secrets-setup.sql");
fs.writeFileSync(outPath, output, "utf8");
console.log(`Wrote ${outPath}`);
