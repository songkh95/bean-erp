import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. Vercel에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 설정하거나, " +
        "서버에서만 쓰는 SUPABASE_URL, SUPABASE_ANON_KEY(또는 SUPABASE_PUBLISHABLE_KEY)를 동일 값으로 넣고 재배포하세요."
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies directly.
        }
      },
    },
  });
}
