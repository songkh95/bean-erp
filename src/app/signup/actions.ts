"use server"

import { createClient } from "@/lib/supabase/server"

export type SignupActionState = {
  success: boolean
  message: string
}

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!companyName || !email || !password) {
    return {
      success: false,
      message: "회사명, 이메일, 비밀번호를 모두 입력해 주세요.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        company_name: companyName,
      },
    },
  })

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  return {
    success: true,
    message: "회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.",
  }
}
