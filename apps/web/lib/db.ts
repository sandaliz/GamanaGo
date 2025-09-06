import { Pool } from "pg";

let pool: Pool | null = null;

export function pg() {
  if (!pool) {
    const cs = process.env.DATABASE_URL;  // read at call time
    if (!cs) {
      // Helpful message if the .env didn’t load:
      throw new Error(
        "DATABASE_URL missing. Add it to apps/web/.env.local and restart `npm run dev`."
      );
    }
    pool = new Pool({ connectionString: cs });
  }
  return pool;
}
