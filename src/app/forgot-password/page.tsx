"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

    if (error) {
      toast.error(error.message)
      setIsSubmitting(false)
      return
    }

    toast.success("비밀번호 재설정 링크가 이메일로 발송되었습니다.")
    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>비밀번호 찾기</CardTitle>
          <CardDescription>가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "전송 중..." : "확인"}
            </Button>

            <p className="text-center text-sm text-slate-600">
              <Link href="/login" className="font-medium text-slate-900 underline underline-offset-4">
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
