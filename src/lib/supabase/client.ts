"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const missingEnvMessage =
  "Supabase 환경 변수가 없습니다. Vercel → Project → Settings → Environment Variables에 " +
  "NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 설정한 뒤 재배포하세요.";

function createMissingConfigClient(): SupabaseClient<Database> {
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(missingEnvMessage);
    },
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient<Database> =
  supabaseUrl && supabasePublishableKey
    ? createBrowserClient<Database>(supabaseUrl, supabasePublishableKey)
    : createMissingConfigClient();
