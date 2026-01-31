import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";

import type { Database } from "../../src/db/database.types";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const e2eUserId = process.env.E2E_USERNAME_ID ?? "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables for e2e teardown.");
}

if (!e2eUserId) {
  throw new Error("Missing E2E user id for Supabase teardown.");
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const deleteByPlantIds = async (table: "care_log" | "disease_entry" | "seasonal_schedule", ids: string[]) => {
  if (!ids.length) {
    return;
  }

  const { error } = await supabase.from(table).delete().in("plant_card_id", ids);

  if (error) {
    throw new Error(`Failed to cleanup ${table}: ${error.message}`);
  }
};

teardown("cleanup supabase after e2e", async () => {
  const { data: plantCards, error: plantCardsError } = await supabase
    .from("plant_card")
    .select("id")
    .eq("user_id", e2eUserId);

  if (plantCardsError) {
    throw new Error(`Failed to fetch plant cards: ${plantCardsError.message}`);
  }

  const plantCardIds = (plantCards ?? []).map((card) => card.id);

  await deleteByPlantIds("care_log", plantCardIds);
  await deleteByPlantIds("disease_entry", plantCardIds);
  await deleteByPlantIds("seasonal_schedule", plantCardIds);

  const { error: plantCardDeleteError } = await supabase.from("plant_card").delete().eq("user_id", e2eUserId);

  if (plantCardDeleteError) {
    throw new Error(`Failed to cleanup plant_card: ${plantCardDeleteError.message}`);
  }
});
