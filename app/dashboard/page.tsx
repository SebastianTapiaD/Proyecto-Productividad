import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🏠 Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Bienvenido a tu sistema de productividad
        </p>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Módulo Tareas */}
          <Link href="/dashboard/tasks">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Tareas
              </h2>
              <p className="text-gray-600">
                Gestiona tus tareas diarias y proyectos
              </p>
              <div className="mt-4 text-blue-600 font-semibold">
                Ver módulo →
              </div>
            </div>
          </Link>

          {/* Módulo Finanzas (próximamente) */}
          <div className="bg-gray-100 p-6 rounded-lg shadow opacity-50">
            <div className="text-4xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-gray-600 mb-2">
              Finanzas
            </h2>
            <p className="text-gray-500">
              Control de gastos e ingresos
            </p>
            <div className="mt-4 text-gray-400 font-semibold">
              🚧 Próximamente
            </div>
          </div>

          {/* Módulo Nutrición (próximamente) */}
          <div className="bg-gray-100 p-6 rounded-lg shadow opacity-50">
            <div className="text-4xl mb-4">🥗</div>
            <h2 className="text-2xl font-bold text-gray-600 mb-2">
              Nutrición
            </h2>
            <p className="text-gray-500">
              Planifica comidas y tracking de macros
            </p>
            <div className="mt-4 text-gray-400 font-semibold">
              🚧 Próximamente
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
