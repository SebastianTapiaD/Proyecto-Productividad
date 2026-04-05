import Link from 'next/link'

const modules = [
  {
    href: '/dashboard/tasks',
    label: 'Tareas',
    description: 'Gestiona tus tareas diarias y proyectos con ciclos de repetición.',
    available: true,
  },
  {
    href: '#',
    label: 'Finanzas',
    description: 'Control de gastos e ingresos personales.',
    available: false,
  },
  {
    href: '#',
    label: 'Nutrición',
    description: 'Planifica comidas y lleva un seguimiento de macros.',
    available: false,
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-base py-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-text mb-1">Dashboard</h1>
          <p className="text-text-muted">Selecciona un módulo para comenzar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) =>
            mod.available ? (
              <Link key={mod.label} href={mod.href}>
                <div className="group bg-surface border border-border rounded-xl p-6 hover:border-accent/50 transition-colors cursor-pointer h-full flex flex-col">
                  <h2 className="text-lg font-semibold text-text mb-2 group-hover:text-accent transition-colors">
                    {mod.label}
                  </h2>
                  <p className="text-sm text-text-muted leading-relaxed mb-4">
                    {mod.description}
                  </p>
                  <span className="text-sm font-medium text-accent mt-auto">
                    Abrir modulo &rarr;
                  </span>
                </div>
              </Link>
            ) : (
              <div
                key={mod.label}
                className="bg-surface border border-border rounded-xl p-6 opacity-40 cursor-not-allowed h-full"
              >
                <h2 className="text-lg font-semibold text-text mb-2">{mod.label}</h2>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  {mod.description}
                </p>
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Proximamente
                </span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
