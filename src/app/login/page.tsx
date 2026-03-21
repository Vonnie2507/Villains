'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const err = await signIn(email, password)
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="you@villains.com.au"
          icon={<Mail className="w-4 h-4" />}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          icon={<Lock className="w-4 h-4" />}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-status-error bg-status-error-50 border border-status-error/20 rounded px-3 py-2">
            {error}
          </p>
        )}

        <Button className="w-full" size="lg" loading={loading} type="submit">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
