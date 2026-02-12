'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
  cycleInDays: number        // Cada cuántos días se resetea
  lastCompletedAt: string | null  // Última vez completada
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [cycleInDays, setCycleInDays] = useState(1)  // Por defecto: diario
  const { data: session, status } = useSession()

  // Cargar tareas al inicio
  useEffect(() => {
    if (status === 'authenticated') {
      fetchTasks()
    }
  }, [status])

  // Función para obtener tareas
  async function fetchTasks() {
    try {
      const response = await fetch('/api/tasks')
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        toast.error(errorData.error || 'Error al cargar tareas')
        setTasks([])
        setLoading(false)
        return
      }
      
      const data = await response.json()
      
      if (Array.isArray(data)) {
        setTasks(data)
      } else {
        console.error('API no devolvió array:', data)
        setTasks([])
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error al cargar tareas:', error)
      toast.error('Error de conexión')
      setTasks([])
      setLoading(false)
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newTaskTitle.trim()) {
      toast.warning('El título no puede estar vacío')
      return
    }

    if (!session?.user?.id) {
      toast.error('Debes estar autenticado')
      return
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle,
          userId: session.user.id,
          cycleInDays: cycleInDays  // Enviar el ciclo seleccionado
        })
      })

      if (response.ok) {
        setNewTaskTitle('')
        setCycleInDays(1)  // Resetear selector a "Diario" después de crear
        fetchTasks()
        toast.success('Tarea creada exitosamente')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al crear tarea')
      }
    } catch (error) {
      console.error('Error al crear tarea:', error)
      toast.error('Error de conexión al crear tarea')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Debes iniciar sesión
          </h1>
          <a href="/login" className="text-blue-600 hover:text-blue-500">
            Ir a Login →
          </a>
        </div>
      </div>
    )
  }

  // Toggle completado
  async function toggleTask(id: string, completed: boolean) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      fetchTasks()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Eliminar tarea
  function deleteTask(id: string) {
    toast.warning('¿Estás seguro de eliminar esta tarea?', {
      description: 'Esta acción no se puede deshacer',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await fetch(`/api/tasks/${id}`, {
              method: 'DELETE'
            })
            fetchTasks()
            toast.success('Tarea eliminada correctamente')
          } catch (error) {
            console.error('Error al eliminar:', error)
            toast.error('Hubo un error al eliminar')
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => console.log('Cancelación'),
      },
      classNames: {
        toast: '!w-full md:!w-[410px]',
        actionButton: '!bg-red-600 !text-white hover:!bg-red-500',
        cancelButton: '!bg-black !text-white hover:!bg-gray-800'
      },
      duration: 5000,
    });
  }

  function startEdit(id: string, currentTitle: string) {
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingTitle('')
  }

  async function saveEdit(id: string) {
    if (!editingTitle.trim()) {
      toast.warning('El título no puede estar vacío')
      return
    }

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle })
      })
      
      if (response.ok) {
        setEditingId(null)
        setEditingTitle('')
        fetchTasks()
        toast.success('Tarea actualizada correctamente')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Error al editar tarea')
      }
    } catch (error) {
      console.error('Error al editar:', error)
      toast.error('Error de conexión al editar tarea')
    }
  }

  // Función helper para mostrar el texto del ciclo
  function getCycleText(days: number): string {
    if (days === 1) return '🔄 Diaria'
    if (days === 2) return '🔄 Cada 2 días'
    if (days === 7) return '🔄 Semanal'
    if (days === 14) return '🔄 Quincenal'
    if (days === 30) return '🔄 Mensual'
    return `🔄 Cada ${days} días`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          📝 Mis Tareas
        </h1>

        {/* Formulario mejorado con selector de ciclo */}
        <form onSubmit={createTask} className="mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            {/* Input de título */}
            <input
              type="text" 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Escribe una nueva tarea..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 text-gray-900 bg-white mb-3"
            />
            
            {/* Selector de ciclo + Botón crear */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <label htmlFor="cycleInput" className="text-gray-700 font-medium whitespace-nowrap">
                  🔄 Ciclo:
                </label>
                <input
                  id="cycleInput"
                  type="number"
                  min="1"
                  max="365"
                  value={cycleInDays}
                  onChange={(e) => setCycleInDays(Number(e.target.value))}
                  placeholder="1"
                  className="w-20 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white text-center"
                />
                <span className="text-gray-600 text-sm">
                  {cycleInDays === 1 ? 'día' : 'días'}
                </span>
              </div>             
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                Agregar
              </button>
            </div>
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
                        {/* Layout mejorado para mostrar título + ciclo */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block cursor-pointer ${
                              task.completed
                                ? 'line-through text-gray-400'
                                : 'text-gray-900'
                            }`}
                            onDoubleClick={() => startEdit(task.id, task.title)}
                            title="Doble click para editar"
                          >
                            {task.title}
                          </span>
                          
                          {/* Mostrar el ciclo de la tarea */}
                          <span className="text-xs text-gray-500">
                            {getCycleText(task.cycleInDays)}
                          </span>
                        </div>
                        
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                          {new Date(task.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
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
