'use client'

import { AuthLayout } from '@/components/layouts/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          icon={<Mail className="w-4 h-4" />}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          icon={<Lock className="w-4 h-4" />}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-secondary">
            <input type="checkbox" className="rounded border-border" />
            Remember me
          </label>
          <a href="#" className="text-brand-600 hover:text-brand-700 font-medium">Forgot password?</a>
        </div>

        <Button className="w-full" size="lg">Sign in</Button>

        <p className="text-sm text-text-secondary text-center">
          Don&apos;t have an account?{' '}
          <a href="#" className="text-brand-600 hover:text-brand-700 font-medium">Sign up</a>
        </p>
      </form>
    </AuthLayout>
  )
}
