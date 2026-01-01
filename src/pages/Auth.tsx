import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthForm } from '@/components/auth/AuthForm'
import { useAuthStore } from '@/lib/stores/auth-store'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const { user, initialized, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // If user is authenticated, redirect to dashboard
  if (initialized && user) {
    return <Navigate to="/dashboard" replace />
  }

  // Show loading while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-gradient-gold mb-2">
            Aiuteur
          </h1>
          <p className="text-muted-foreground">
            Transform narratives into cinematic AI films
          </p>
        </div>

        <AuthForm mode={mode} onModeChange={setMode} />
      </div>
    </div>
  )
}
