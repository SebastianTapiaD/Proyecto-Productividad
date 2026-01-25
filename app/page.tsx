'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)

  // Cargar tareas al inicio
  useEffect(() => {
    fetchTasks()
  }, [])

  // Función para obtener tareas de la API
  async function fetchTasks() {
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      setTasks(data)
      setLoading(false)
    } catch (error) {
      console.error('Error al cargar tareas:', error)
      setLoading(false)
    }
  }

  // Función para crear nueva tarea
  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newTaskTitle.trim()) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle,
          userId: 'cmkrr3u4w0000fkqc1hw01cvn' // Lo cambiaremos después
        })
      })

      if (response.ok) {
        setNewTaskTitle('') // Limpiar input
        fetchTasks() // Recargar tareas
      }
    } catch (error) {
      console.error('Error al crear tarea:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          📝 Mis Tareas
        </h1>

        {/* Formulario para crear tarea */}
        <form onSubmit={createTask} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Escribe una nueva tarea..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 text-gray-900 bg-white"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Agregar
            </button>
          </div>
        </form>

        {/* Lista de tareas */}
        <div className="bg-white rounded-lg shadow">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay tareas todavía. ¡Crea tu primera tarea!
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      className="w-5 h-5 text-blue-600 rounded"
                      readOnly
                    />
                    <span
                      className={`flex-1 ${
                        task.completed
                          ? 'line-through text-gray-400'
                          : 'text-gray-900'
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Contador */}
        <div className="mt-4 text-center text-gray-600">
          Total: {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
