"use client"

import Link from "next/link"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import { signupAction, type SignupActionState } from "@/app/signup/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: SignupActionState = {
  success: false,
  message: "",
}

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState)

  useEffect(() => {
    if (!state.message) return

    if (state.success) {
      toast.success(state.message)
      return
    }

    toast.error(state.message)
  }, [state])

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>회원가입</CardTitle>
          <CardDescription>회사 계정을 새로 생성합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">회사명</Label>
              <Input id="companyName" name="companyName" placeholder="회사명을 입력해 주세요" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" name="email" type="email" placeholder="name@company.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8자 이상 비밀번호"
                minLength={8}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "가입 중..." : "회원가입"}
            </Button>

            <p className="text-center text-sm text-slate-600">
              이미 계정이 있나요?{" "}
              <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">
                로그인
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
