'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type TransactionType = 'INCOME' | 'EXPENSE'
type View = 'month' | 'summary'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  date: string
  createdAt: string
}

interface Summary {
  income: number
  expenses: number
  balance: number
}

interface MonthSummary {
  key: string
  year: number
  month: number // 0-indexed
  income: number
  expenses: number
  balance: number
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES = [
  'Supermercado',
  'Restaurante / Delivery',
  'Transporte',
  'Arriendo / Vivienda',
  'Servicios',
  'Salud',
  'Entretenimiento',
  'Ropa / Calzado',
  'Educación',
  'Otro',
]

const INCOME_CATEGORIES = [
  'Sueldo',
  'Freelance',
  'Inversión',
  'Bono',
  'Otro',
]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

function toMonthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function dateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('es-CL')
}

// Devuelve la fecha default del formulario según el mes visualizado:
// - Mes actual → hoy
// - Mes pasado → último día de ese mes
// - Mes futuro → primer día de ese mes
function defaultDateForMonth(year: number, month: number): string {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())

  if (isCurrentMonth) return dateInputValue(now)
  if (isPast) return dateInputValue(new Date(year, month + 1, 0)) // último día del mes
  return dateInputValue(new Date(year, month, 1)) // primer día del mes
}

// Agrupa transacciones por categoría y calcula totales para el gráfico
function groupByCategory(transactions: Transaction[], type: TransactionType) {
  const map: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type !== type) continue
    map[t.category] = (map[t.category] ?? 0) + t.amount
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((acc, [, v]) => acc + v, 0)
  return entries.map(([category, amount]) => ({
    category,
    amount,
    pct: total > 0 ? Math.round((amount / total) * 100) : 0,
  }))
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function FinancesPage() {
  const { data: session, status } = useSession()

  // Vista activa
  const [view, setView] = useState<View>('month')

  // Estado del mes seleccionado
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  // Datos — vista mes
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, balance: 0 })
  const [loading, setLoading] = useState(true)

  // Datos — vista resumen
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryYear, setSummaryYear] = useState(now.getFullYear())

  // Formulario de nueva transacción
  const [formType, setFormType] = useState<TransactionType>('EXPENSE')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formDate, setFormDate] = useState(() => defaultDateForMonth(now.getFullYear(), now.getMonth()))
  const [formOpen, setFormOpen] = useState(false)

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState<TransactionType>('EXPENSE')

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const month = toMonthParam(selectedYear, selectedMonth)
      const res = await fetch(`/api/transactions?month=${month}`)

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al cargar transacciones')
        setLoading(false)
        return
      }

      const data = await res.json()
      setTransactions(data.transactions)
      setSummary(data.summary)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTransactions()
    }
  }, [status, fetchTransactions])

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/transactions/summary?year=${summaryYear}`)
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al cargar resumen')
        return
      }
      const data = await res.json()
      setMonthSummaries(data.months)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSummaryLoading(false)
    }
  }, [summaryYear])

  useEffect(() => {
    if (status === 'authenticated' && view === 'summary') {
      fetchSummary()
    }
  }, [status, view, fetchSummary])

  // ---------------------------------------------------------------------------
  // Navegación de mes
  // ---------------------------------------------------------------------------

  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  // ---------------------------------------------------------------------------
  // Crear transacción
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    const amount = parseInt(formAmount.replace(/\D/g, ''), 10)
    if (!amount || amount <= 0) {
      toast.warning('Ingresa un monto válido')
      return
    }
    if (!formCategory) {
      toast.warning('Selecciona una categoría')
      return
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          amount,
          category: formCategory,
          description: formDescription,
          date: formDate,
        }),
      })

      if (res.ok) {
        setFormAmount('')
        setFormCategory('')
        setFormDescription('')
        setFormDate(defaultDateForMonth(selectedYear, selectedMonth))
        setFormOpen(false)
        fetchTransactions()
        toast.success('Transacción registrada')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al registrar')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  // ---------------------------------------------------------------------------
  // Edición
  // ---------------------------------------------------------------------------

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditType(t.type)
    setEditAmount(formatAmountInput(String(t.amount)))
    setEditCategory(t.category)
    setEditDescription(t.description ?? '')
    setEditDate(t.date.slice(0, 10))
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    const amount = parseInt(editAmount.replace(/\D/g, ''), 10)
    if (!amount || amount <= 0) {
      toast.warning('Ingresa un monto válido')
      return
    }
    if (!editCategory) {
      toast.warning('Selecciona una categoría')
      return
    }

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          amount,
          category: editCategory,
          description: editDescription,
          date: editDate,
        }),
      })

      if (res.ok) {
        setEditingId(null)
        fetchTransactions()
        toast.success('Transacción actualizada')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  // ---------------------------------------------------------------------------
  // Eliminar
  // ---------------------------------------------------------------------------

  function handleDelete(id: string) {
    toast.warning('¿Eliminar esta transacción?', {
      description: 'Esta acción no se puede deshacer',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
            fetchTransactions()
            toast.success('Transacción eliminada')
          } catch {
            toast.error('Error al eliminar')
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
      classNames: {
        toast: '!w-full md:!w-[410px]',
        actionButton: '!bg-danger !text-white hover:!bg-danger-hover',
        cancelButton: '!bg-surface-raised !text-text hover:!bg-border',
      },
      duration: 5000,
    })
  }

  // ---------------------------------------------------------------------------
  // Categorías del formulario según tipo
  // ---------------------------------------------------------------------------

  const categories = formType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const editCategories = editType === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  // ---------------------------------------------------------------------------
  // Datos del gráfico
  // ---------------------------------------------------------------------------

  const expenseGroups = groupByCategory(transactions, 'EXPENSE')

  // ---------------------------------------------------------------------------
  // Guard de sesión
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-base py-10">
      <div className="max-w-2xl mx-auto px-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">Finanzas</h1>
            <p className="text-text-muted text-sm mt-0.5">Flujo de caja personal</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface-raised border border-border rounded-lg p-1">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'month'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Registrar
            </button>
            <button
              onClick={() => setView('summary')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'summary'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              Resumen
            </button>
          </div>
        </div>

        {/* Selector de mes — solo en vista mes */}
        {view === 'month' && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
              title="Mes anterior"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="text-sm font-medium text-text w-36 text-center">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
              title="Mes siguiente"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Vista: Mes                                                         */}
        {/* ------------------------------------------------------------------ */}
        {view === 'month' && <>

        {/* Cards de resumen */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Ingresos</p>
            <p className="text-lg font-bold text-success">{formatCLP(summary.income)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Gastos</p>
            <p className="text-lg font-bold text-danger">{formatCLP(summary.expenses)}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">Balance</p>
            <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCLP(summary.balance)}
            </p>
          </div>
        </div>

        {/* Botón / formulario de nueva transacción */}
        {!formOpen ? (
          <button
            onClick={() => {
              setFormDate(defaultDateForMonth(selectedYear, selectedMonth))
              setFormOpen(true)
            }}
            className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-text-muted hover:text-text hover:border-accent/40 transition-colors"
          >
            + Registrar transacción
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="bg-surface border border-border rounded-xl p-4 space-y-3"
          >
            {/* Tipo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setFormType('EXPENSE'); setFormCategory('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'EXPENSE'
                    ? 'bg-danger/15 text-danger border border-danger/30'
                    : 'bg-surface-raised text-text-muted border border-border hover:text-text'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => { setFormType('INCOME'); setFormCategory('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'INCOME'
                    ? 'bg-success/15 text-success border border-success/30'
                    : 'bg-surface-raised text-text-muted border border-border hover:text-text'
                }`}
              >
                Ingreso
              </button>
            </div>

            {/* Monto y categoría */}
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={formAmount}
                onChange={(e) => setFormAmount(formatAmountInput(e.target.value))}
                placeholder="Monto ($)"
                className="flex-1 px-3 py-2 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
                required
              />
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition text-sm"
                required
              >
                <option value="">Categoría</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Descripción y fecha */}
            <div className="flex gap-2">
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                className="flex-1 px-3 py-2 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition placeholder:text-text-muted/50 text-sm"
              />
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="px-3 py-2 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition text-sm"
                required
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm"
              >
                Guardar
              </button>
            </div>
          </form>
        )}

        {/* Gráfico de gastos por categoría */}
        {expenseGroups.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text mb-3">Gastos por categoría</h2>
            <div className="space-y-2">
              {expenseGroups.map(({ category, amount, pct }) => (
                <div key={category}>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>{category}</span>
                    <span>{formatCLP(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                    <div
                      className="h-full bg-danger/60 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de transacciones */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">Cargando...</div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-text-muted text-sm">
                No hay transacciones en {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t) => (
                <li key={t.id} className="px-4 py-3 hover:bg-surface-raised transition-colors">
                  {editingId === t.id ? (
                    /* Fila en modo edición */
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditType('EXPENSE'); setEditCategory('') }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            editType === 'EXPENSE'
                              ? 'bg-danger/15 text-danger border border-danger/30'
                              : 'bg-surface-raised text-text-muted border border-border'
                          }`}
                        >
                          Gasto
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditType('INCOME'); setEditCategory('') }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            editType === 'INCOME'
                              ? 'bg-success/15 text-success border border-success/30'
                              : 'bg-surface-raised text-text-muted border border-border'
                          }`}
                        >
                          Ingreso
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editAmount}
                          onChange={(e) => setEditAmount(formatAmountInput(e.target.value))}
                          className="flex-1 px-3 py-1.5 bg-surface-raised border border-accent/60 text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                          autoFocus
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                        >
                          {editCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Descripción (opcional)"
                          className="flex-1 px-3 py-1.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-muted/50 text-sm"
                        />
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="px-3 py-1.5 bg-surface-raised border border-border text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-sm"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1 text-xs text-text-muted hover:text-text transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEdit(t.id)}
                          className="px-3 py-1 bg-success/20 text-success rounded text-xs font-medium hover:bg-success/30 transition-colors"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Fila normal */
                    <div className="flex items-center gap-3">
                      {/* Indicador tipo */}
                      <div
                        className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                          t.type === 'INCOME' ? 'bg-success' : 'bg-danger'
                        }`}
                      />

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text truncate">{t.category}</span>
                          {t.description && (
                            <span className="text-xs text-text-muted truncate hidden sm:block">
                              — {t.description}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(t.date).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                        </span>
                      </div>

                      {/* Monto */}
                      <span
                        className={`text-sm font-semibold flex-shrink-0 ${
                          t.type === 'INCOME' ? 'text-success' : 'text-text'
                        }`}
                      >
                        {t.type === 'INCOME' ? '+' : '-'}{formatCLP(t.amount)}
                      </span>

                      {/* Acciones */}
                      <button
                        onClick={() => startEdit(t)}
                        className="p-1.5 text-text-muted hover:text-accent rounded transition-colors flex-shrink-0"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-text-muted hover:text-danger rounded transition-colors flex-shrink-0"
                        title="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {transactions.length > 0 && (
          <p className="text-center text-xs text-text-muted">
            {transactions.length} transacción{transactions.length !== 1 ? 'es' : ''} en {MONTH_NAMES[selectedMonth]}
          </p>
        )}

        </>}

        {/* ------------------------------------------------------------------ */}
        {/* Vista: Resumen por períodos                                         */}
        {/* ------------------------------------------------------------------ */}
        {view === 'summary' && <>

        {/* Selector de año */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setSummaryYear((y) => y - 1)}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
            title="Año anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span className="text-sm font-medium text-text w-12 text-center">{summaryYear}</span>
          <button
            onClick={() => setSummaryYear((y) => y + 1)}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-raised transition-colors"
            title="Año siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {summaryLoading ? (
          <div className="p-8 text-center text-text-muted text-sm">Cargando resumen...</div>
        ) : (
          <>
            {/* Cards totales del año */}
            {(() => {
              const yearIncome   = monthSummaries.reduce((acc, m) => acc + m.income, 0)
              const yearExpenses = monthSummaries.reduce((acc, m) => acc + m.expenses, 0)
              const yearBalance  = yearIncome - yearExpenses
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Ingresos {summaryYear}</p>
                    <p className="text-lg font-bold text-success">{formatCLP(yearIncome)}</p>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Gastos {summaryYear}</p>
                    <p className="text-lg font-bold text-danger">{formatCLP(yearExpenses)}</p>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-4">
                    <p className="text-xs text-text-muted mb-1">Balance {summaryYear}</p>
                    <p className={`text-lg font-bold ${yearBalance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCLP(yearBalance)}
                    </p>
                  </div>
                </div>
              )
            })()}
            {/* Tabla de meses */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 px-4 py-2 border-b border-border bg-surface-raised">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Mes</span>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Ingresos</span>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Gastos</span>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Balance</span>
              </div>
              {monthSummaries.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-text-muted text-sm">Sin datos en este período.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {[...monthSummaries].reverse().map((m) => (
                    <li
                      key={m.key}
                      className="grid grid-cols-4 px-4 py-3 hover:bg-surface-raised transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedYear(m.year)
                        setSelectedMonth(m.month)
                        setView('month')
                      }}
                      title="Ver detalle del mes"
                    >
                      <span className="text-sm text-text font-medium">
                        {MONTH_NAMES[m.month]} {m.year}
                      </span>
                      <span className="text-sm text-success text-right">
                        {m.income > 0 ? formatCLP(m.income) : '—'}
                      </span>
                      <span className="text-sm text-danger text-right">
                        {m.expenses > 0 ? formatCLP(m.expenses) : '—'}
                      </span>
                      <span className={`text-sm font-semibold text-right ${
                        m.balance > 0 ? 'text-success' : m.balance < 0 ? 'text-danger' : 'text-text-muted'
                      }`}>
                        {m.income === 0 && m.expenses === 0 ? '—' : formatCLP(m.balance)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Gráfico de barras comparativo */}
            {monthSummaries.some((m) => m.income > 0 || m.expenses > 0) && (() => {
              const maxVal = Math.max(...monthSummaries.flatMap((m) => [m.income, m.expenses]))
              return (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-text mb-4">Ingresos vs Gastos</h2>
                  <div className="space-y-3">
                    {[...monthSummaries].reverse().map((m) => (
                      <div key={m.key}>
                        <span className="text-xs text-text-muted block mb-1">
                          {MONTH_NAMES[m.month].slice(0, 3)} {m.year}
                        </span>
                        <div className="space-y-1">
                          {/* Barra ingresos */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted w-14 text-right">Ing.</span>
                            <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success/60 rounded-full transition-all duration-300"
                                style={{ width: maxVal > 0 ? `${(m.income / maxVal) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-xs text-text-muted w-24 text-right">
                              {m.income > 0 ? formatCLP(m.income) : '—'}
                            </span>
                          </div>
                          {/* Barra gastos */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted w-14 text-right">Gas.</span>
                            <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                              <div
                                className="h-full bg-danger/60 rounded-full transition-all duration-300"
                                style={{ width: maxVal > 0 ? `${(m.expenses / maxVal) * 100}%` : '0%' }}
                              />
                            </div>
                            <span className="text-xs text-text-muted w-24 text-right">
                              {m.expenses > 0 ? formatCLP(m.expenses) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </>
        )}

        </>}

      </div>
    </div>
  )
}
