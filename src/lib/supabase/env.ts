/**
 * Vercel / Edge: NEXT_PUBLIC_* 는 클라이언트 번들에 박힐 수 있어,
 * Proxy(미들웨어)·서버에서는 요청 시점에 읽고, 없으면 서버 전용 키로 폴백합니다.
 * (둘 다 없으면 빈 문자열)
 */
export function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim();
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    ""
  ).trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
