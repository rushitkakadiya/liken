import type { Look } from "@/lib/auth";
import { enrichLookColorNames } from "@/lib/lookColors";
import type { DbSavedLook, DbSavedLookInsert } from "@/types/database";
import { getSupabase } from "@/lib/supabaseClient";

function mapDbToLook(row: DbSavedLook): Look {
  return enrichLookColorNames({
    id: row.id,
    occasion: row.occasion,
    score: row.score,
    explanation: row.explanation,
    top: row.top,
    bottom: row.bottom,
    shoes: row.shoes,
    topColor: row.top_color,
    bottomColor: row.bottom_color,
    shoesColor: row.shoes_color,
    topColorName: row.top_color_name ?? undefined,
    bottomColorName: row.bottom_color_name ?? undefined,
    shoesColorName: row.shoes_color_name ?? undefined,
    topColorFamily: row.top_color_family ?? undefined,
    bottomColorFamily: row.bottom_color_family ?? undefined,
    shoesColorFamily: row.shoes_color_family ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  });
}

function mapLookToInsert(userId: string, look: Look): DbSavedLookInsert {
  return {
    user_id: userId,
    occasion: look.occasion,
    score: look.score,
    explanation: look.explanation,
    top: look.top,
    bottom: look.bottom,
    // Legacy columns — footwear is no longer recommended; store placeholders for older schema.
    shoes: look.shoes ?? "",
    top_color: look.topColor,
    bottom_color: look.bottomColor,
    shoes_color: look.shoesColor ?? "#808080",
    top_color_name: look.topColorName ?? null,
    bottom_color_name: look.bottomColorName ?? null,
    shoes_color_name: look.shoesColorName ?? null,
    top_color_family: look.topColorFamily ?? null,
    bottom_color_family: look.bottomColorFamily ?? null,
    shoes_color_family: look.shoesColorFamily ?? null,
  };
}

export async function fetchSavedLooks(userId: string): Promise<Look[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("saved_looks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDbToLook);
}

export async function insertSavedLook(userId: string, look: Look): Promise<Look> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("saved_looks")
    .insert(mapLookToInsert(userId, look))
    .select("*")
    .single();

  if (error) throw error;
  return mapDbToLook(data);
}

export async function removeSavedLook(userId: string, lookId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("saved_looks")
    .delete()
    .eq("user_id", userId)
    .eq("id", lookId);

  if (error) throw error;
}
