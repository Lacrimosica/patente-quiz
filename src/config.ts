import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export const DB_PATH = join(ROOT, "data/db/patente.db");
export const RAW_DIR = join(ROOT, "data/raw");
export const SEED_SQL_PATH = join(ROOT, "data/seed.sql");
