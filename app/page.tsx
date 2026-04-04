export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white px-4">
        <h1 className="text-6xl font-bold mb-6">
          📊 Sistema de Productividad
        </h1>
        <p className="text-xl mb-8 text-blue-100">
          Gestiona tus tareas, finanzas y hábitos en un solo lugar
        </p>
        
        <div className="flex gap-4 justify-center">
          <a 
            href="/login" 
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition"
          >
            Iniciar Sesion
          </a>
        </div>
      </div>
    </div>
  )
}
