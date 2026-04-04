export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent border border-accent/30 bg-accent/10 px-4 py-1.5 rounded-full mb-6">
            Sistema de Productividad
          </span>
          <h1 className="text-5xl font-bold text-text leading-tight mb-4">
            Gestiona tu día
            <span className="block text-accent">con claridad</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed">
            Tareas, finanzas y hábitos en un solo lugar.
            Diseñado para mantener el foco en lo que importa.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors"
          >
            Iniciar sesión
          </a>
          <a
            href="/register"
            className="px-8 py-3 bg-surface text-text font-semibold rounded-lg border border-border hover:border-accent/50 hover:text-accent transition-colors"
          >
            Crear cuenta
          </a>
        </div>
      </div>
    </div>
  )
}
