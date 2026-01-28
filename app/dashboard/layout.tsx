'use client'

import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  // MOSTRAR LOADING MIENTRAS VERIFICA SESIÓN
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Verificando sesión...</p>
      </div>
    )
  }

  // EDIRIGIR SI NO HAY SESIÓN
  if (!session) {
    return null 
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
              📊 ProductividApp
            </Link>
            
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
                🏠 Dashboard
              </Link>
              <Link href="/dashboard/tasks" className="text-gray-600 hover:text-blue-600">
                📝 Tareas
              </Link>
            </div>

            {/* ← SOLO SI HAY SESIÓN */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session.user?.name || session.user?.email}
                </p>
                <p className="text-xs text-gray-500">
                  {session.user?.email}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}
