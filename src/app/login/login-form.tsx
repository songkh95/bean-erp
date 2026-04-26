"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"

import { loginAction, type LoginActionState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: LoginActionState = {
  success: false,
  message: "",
}

export function LoginForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const [email, setEmail] = useState("")
  const [rememberEmail, setRememberEmail] = useState(false)

  useEffect(() => {
    const remembered = window.localStorage.getItem("rememberedEmail")
    if (!remembered) return

    setEmail(remembered)
    setRememberEmail(true)
  }, [])

  useEffect(() => {
    if (!state.message) return

    if (state.success) {
      if (rememberEmail) {
        window.localStorage.setItem("rememberedEmail", email.trim())
      } else {
        window.localStorage.removeItem("rememberedEmail")
      }

      toast.success(state.message)
      router.replace("/")
      router.refresh()
      return
    }

    toast.error(state.message)
  }, [email, rememberEmail, router, state])

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>로그인</CardTitle>
          <CardDescription>계정으로 로그인 후 ERP를 이용해 주세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" placeholder="비밀번호를 입력해 주세요" required />
            </div>

            <label htmlFor="remember-email" className="flex items-center gap-2 text-sm text-slate-600">
              <input
                id="remember-email"
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
              />
              아이디 기억하기
            </label>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "로그인 중..." : "로그인"}
            </Button>

            <p className="text-center text-sm">
              <Link href="/forgot-password" className="font-medium text-slate-700 underline underline-offset-4">
                비밀번호를 잊으셨나요?
              </Link>
            </p>

            <p className="text-center text-sm text-slate-600">
              계정이 없나요?{" "}
              <Link href="/signup" className="font-medium text-slate-900 underline underline-offset-4">
                회원가입
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
