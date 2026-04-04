'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log(result)

      if (result?.error) {
        if (
          result.error === 'CredentialsSignin' ||
          result.error === 'CallbackRouteError'
        ) {
          toast.error('Credenciales inválidas')
        } else {
          toast.error('Error al iniciar sesión')
        }
      } else {
        toast.success('¡Inicio de sesión exitoso!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text mb-1">Bienvenido de vuelta</h1>
          <p className="text-text-muted text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-lg">
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 text-sm mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  )
}
