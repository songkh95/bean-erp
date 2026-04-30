import { supabase } from "@/lib/supabase/client";

/** Resolves the current user's primary company (first membership by created_at). */
export async function fetchCurrentCompanyId(): Promise<string | null> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.company_id ?? null;
}
