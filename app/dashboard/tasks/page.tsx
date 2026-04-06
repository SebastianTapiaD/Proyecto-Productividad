'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
  cycleInDays: number
  lastCompletedAt: string | null
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [cycleInDays, setCycleInDays] = useState(1)
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTasks()
    }
  }, [status])

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          userId: session.user.id,
          cycleInDays: cycleInDays,
        }),
      })

      if (response.ok) {
        setNewTaskTitle('')
        setCycleInDays(1)
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
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-text-muted">Cargando...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-3">Debes iniciar sesión para continuar</p>
          <a href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
            Ir a Login &rarr;
          </a>
        </div>
      </div>
    )
  }

  async function toggleTask(id: string, completed: boolean) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      fetchTasks()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  function deleteTask(id: string) {
    toast.warning('¿Estás seguro de eliminar esta tarea?', {
      description: 'Esta acción no se puede deshacer',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
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
        actionButton: '!bg-danger !text-white hover:!bg-danger-hover',
        cancelButton: '!bg-surface-raised !text-text hover:!bg-border',
      },
      duration: 5000,
    })
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
        body: JSON.stringify({ title: editingTitle }),
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

  function getNextResetDate(task: Task): string | null {
    if (!task.completed || !task.lastCompletedAt) return null
    const base = new Date(task.lastCompletedAt)
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + task.cycleInDays)
    return base.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  function getCycleText(days: number): string {
    if (days === 1) return 'Diaria'
    if (days === 2) return 'Cada 2 dias'
    if (days === 7) return 'Semanal'
    if (days === 14) return 'Quincenal'
    if (days === 30) return 'Mensual'
    return `Cada ${days} dias`
  }

  const completed = tasks.filter((t) => t.completed).length

  return (
    <div className="min-h-screen bg-base py-10">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text mb-1">Tareas</h1>
            <p className="text-text-muted text-sm">
              {completed} de {tasks.length} completadas
            </p>
          </div>
        </div>

        {/* Formulario de nueva tarea */}
        <form onSubmit={createTask} className="mb-6">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nueva tarea..."
              className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
            />

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label htmlFor="cycleInput" className="text-sm text-text-muted whitespace-nowrap">
                  Repetir cada
                </label>
                <div className="flex items-stretch border border-border rounded-lg overflow-hidden bg-surface-raised">
                  <button
                    type="button"
                    onClick={() => setCycleInDays((v) => Math.max(1, v - 1))}
                    className="px-2.5 py-2 text-text-muted hover:text-text hover:bg-border transition-colors text-sm leading-none select-none"
                  >
                    −
                  </button>
                  <input
                    id="cycleInput"
                    type="number"
                    min="1"
                    max="365"
                    value={cycleInDays}
                    onChange={(e) => setCycleInDays(Math.max(1, Math.min(365, Number(e.target.value))))}
                    className="w-10 py-2 bg-transparent text-text text-sm text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCycleInDays((v) => Math.min(365, v + 1))}
                    className="px-2.5 py-2 text-text-muted hover:text-text hover:bg-border transition-colors text-sm leading-none select-none"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-text-muted">
                  {cycleInDays === 1 ? 'dia' : 'dias'}
                </span>
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm whitespace-nowrap"
              >
                Agregar
              </button>
            </div>
          </div>
        </form>

        {/* Lista de tareas */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">
              Cargando tareas...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-text-muted text-sm">No hay tareas todavia. Crea tu primera tarea.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.map((task) => (
                <li key={task.id} className={`px-4 py-3.5 hover:bg-surface-raised transition-colors border-l-[3px] ${!task.completed ? 'border-l-danger' : 'border-l-success'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id, task.completed)}
                      className="w-4 h-4 rounded cursor-pointer accent-accent flex-shrink-0"
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
                          className="flex-1 px-3 py-1.5 bg-surface-raised border border-accent/60 text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(task.id)}
                          className="px-2.5 py-1 bg-success/20 text-success rounded text-sm font-medium hover:bg-success/30 transition-colors"
                          title="Guardar"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2.5 py-1 bg-surface-raised text-text-muted rounded text-sm hover:text-text transition-colors"
                          title="Cancelar"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`block text-sm cursor-pointer ${
                              task.completed
                                ? 'line-through text-text-muted'
                                : 'text-text'
                            }`}
                            onDoubleClick={() => startEdit(task.id, task.title)}
                            title="Doble click para editar"
                          >
                            {task.title}
                          </span>
                          <span className="text-xs text-text-muted">
                            {getCycleText(task.cycleInDays)}
                          </span>
                        </div>

                        {getNextResetDate(task) && (
                          <span className="text-xs text-text-muted whitespace-nowrap flex-shrink-0" title="Fecha de reinicio">
                            {getNextResetDate(task)}
                          </span>
                        )}

                        <button
                          onClick={() => startEdit(task.id, task.title)}
                          className="p-1.5 text-text-muted hover:text-accent rounded transition-colors flex-shrink-0"
                          title="Editar tarea"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="p-1.5 text-text-muted hover:text-danger rounded transition-colors flex-shrink-0"
                          title="Eliminar tarea"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {tasks.length > 0 && (
          <p className="mt-3 text-center text-xs text-text-muted">
            {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} en total
          </p>
        )}
      </div>
    </div>
  )
}
