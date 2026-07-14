import { getSupabase } from "@/lib/supabaseClient";

const AVATAR_BUCKET = "avatars";

export const storageService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const supabase = getSupabase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  },
};
