"use server"

import { createClient } from "@/lib/supabase/server"

export type LoginActionState = {
  success: boolean
  message: string
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return {
      success: false,
      message: "이메일과 비밀번호를 입력해 주세요.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  return {
    success: true,
    message: "로그인되었습니다.",
  }
}
