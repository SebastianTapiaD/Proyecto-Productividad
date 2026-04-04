'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-text-muted">Verificando sesión...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/tasks', label: 'Tareas' },
    { href: '/dashboard/finances', label: 'Finanzas' },
  ]

  return (
    <div className="min-h-screen bg-base">
      <nav className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-lg font-bold text-accent tracking-tight">
                ProductividApp
              </Link>

              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? 'bg-accent/15 text-accent'
                        : 'text-text-muted hover:text-text hover:bg-surface-raised'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-text leading-none">
                  {session.user?.name || session.user?.email}
                </p>
                {session.user?.name && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {session.user?.email}
                  </p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-3 py-1.5 text-sm font-medium text-text-muted border border-border rounded-md hover:border-danger/50 hover:text-danger transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
