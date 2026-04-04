'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Usuario creado exitosamente')
        router.push('/login')
      } else {
        toast.error(data.error || 'Error al crear usuario')
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
          <h1 className="text-2xl font-bold text-text mb-1">Crear cuenta</h1>
          <p className="text-text-muted text-sm">Completa los datos para comenzar</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 shadow-lg">
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-muted mb-1.5">
                Nombre
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
                placeholder="Tu nombre"
              />
            </div>

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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 text-sm mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-5">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
