import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      {/* Navbar del dashboard */}
      <nav className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
              📊 Mi App
            </Link>
            
            <div className="flex gap-6">
              <Link 
                href="/dashboard/tasks" 
                className="text-gray-600 hover:text-blue-600 font-medium transition"
              >
                📝 Tareas
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-400 cursor-not-allowed"
              >
                💰 Finanzas
              </Link>
              <Link 
                href="/dashboard" 
                className="text-gray-400 cursor-not-allowed"
              >
                🥗 Nutrición
              </Link>
            </div>

            <div className="text-gray-600">
              👤 Usuario de prueba
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido de cada página */}
      {children}
    </div>
  )
}
