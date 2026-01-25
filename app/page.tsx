'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]) // Variable que guarda la lista de tareas
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

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

  // Invertir el estado completado de una tarea en la base de datos y recarga la lista
  async function toggleTask(id: string, completed: boolean) {
  try {
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed })
    })
    fetchTasks() // Recarga lista
  } catch (error) {
    console.error('Error:', error)
  }
}

// Función para eliminar tarea
async function deleteTask(id: string) {
  // Confirmación antes de eliminar
  if (!confirm('¿Estás seguro de eliminar esta tarea?')) {
    return
  }
  
  try {
    await fetch(`/api/tasks/${id}`, {
      method: 'DELETE'
    })
    fetchTasks() // Recarga lista
  } catch (error) {
    console.error('Error al eliminar:', error)
  }
}
  // Función para iniciar edición
  function startEdit(id: string, currentTitle: string) {
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  // Función para cancelar edición
  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  // Función para guardar edición
  async function saveEdit(id: string) {
    if (!editingTitle.trim()) {
      alert('El título no puede estar vacío')
      return
    }

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle })
      })

      setEditingId(null)
      setEditingTitle('')
      fetchTasks() // Recarga lista
    } catch (error) {
      console.error('Error al editar:', error)
  }
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
                      onChange={() => toggleTask(task.id, task.completed)}
                      className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                    />
                    
                    {/* Si está en modo edición, muestra input */}
                    {editingId === task.id ? (
                      <>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(task.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(task.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                          title="Guardar"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                          title="Cancelar"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Modo normal: muestra título */}
                        <span
                          className={`flex-1 cursor-pointer ${
                            task.completed
                              ? 'line-through text-gray-400'
                              : 'text-gray-900'
                          }`}
                          onDoubleClick={() => startEdit(task.id, task.title)}
                          title="Doble click para editar"
                        >
                          {task.title}
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                        
                        {/* Botones de acción */}
                        <button
                          onClick={() => startEdit(task.id, task.title)}
                          className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Editar tarea"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Eliminar tarea"
                        >
                          🗑️
                        </button>
                      </>
                    )}
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
