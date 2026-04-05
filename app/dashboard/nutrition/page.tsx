'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Tab = 'plan' | 'alimentos' | 'macros'
type WeekDay = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO'
type MealType = 'DESAYUNO' | 'ALMUERZO' | 'CENA' | 'COLACION'

interface WeeklyMeal {
  id: string
  weekDay: WeekDay
  mealType: MealType
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes: string | null
  weekStart: string
}

interface Food {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving: number
  unit: string
  inPantry: boolean
}

interface MacroGoal {
  calories: number
  protein: number
  carbs: number
  fat: number
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WEEK_DAYS: WeekDay[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO']

const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
}

const MEAL_TYPES: MealType[] = ['DESAYUNO', 'ALMUERZO', 'CENA', 'COLACION']

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  CENA: 'Cena',
  COLACION: 'Colación',
}

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  DESAYUNO: '☀',
  ALMUERZO: '◑',
  CENA: '☾',
  COLACION: '◆',
}

const DEFAULT_GOAL: MacroGoal = { calories: 2000, protein: 150, carbs: 200, fat: 65 }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekStart(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayWeekDay(): WeekDay {
  const day = new Date().getDay()
  const map: Record<number, WeekDay> = {
    0: 'DOMINGO',
    1: 'LUNES',
    2: 'MARTES',
    3: 'MIERCOLES',
    4: 'JUEVES',
    5: 'VIERNES',
    6: 'SABADO',
  }
  return map[day]
}

function isCurrentWeek(monday: Date): boolean {
  const thisMonday = getMonday(new Date())
  return formatWeekStart(monday) === formatWeekStart(thisMonday)
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} — ${fmt(sunday)}`
}

function macroPercent(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((value / goal) * 100))
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

// ---------------------------------------------------------------------------
// Componente de barra de progreso de macros
// ---------------------------------------------------------------------------

function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string
  value: number
  goal: number
  color: string
}) {
  const pct = macroPercent(value, goal)
  const over = value > goal

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-danger' : 'text-text'}`}>
          {roundMacro(value)} / {goal}g
        </span>
      </div>
      <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-danger' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CalorieBar({ value, goal }: { value: number; goal: number }) {
  const pct = macroPercent(value, goal)
  const over = value > goal

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-text-muted">Calorías</span>
        <span className={`text-xs font-semibold ${over ? 'text-danger' : 'text-text'}`}>
          {Math.round(value)} / {goal} kcal
        </span>
      </div>
      <div className="h-2.5 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulario de comida inline
// ---------------------------------------------------------------------------

interface MealFormState {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  notes: string
}

const EMPTY_MEAL_FORM: MealFormState = {
  name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  notes: '',
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function NutricionPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<Tab>('plan')

  // Plan semanal
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState<WeekDay>(getTodayWeekDay())
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeal[]>([])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null)
  const [mealForm, setMealForm] = useState<MealFormState>(EMPTY_MEAL_FORM)
  const [selectedFoodId, setSelectedFoodId] = useState('')
  const [savingMeal, setSavingMeal] = useState(false)

  // Alimentos
  const [foods, setFoods] = useState<Food[]>([])
  const [foodsLoading, setFoodsLoading] = useState(false)
  const [pantryFilter, setPantryFilter] = useState<'all' | 'pantry'>('all')
  const [showFoodForm, setShowFoodForm] = useState(false)
  const [editingFood, setEditingFood] = useState<Food | null>(null)
  const [foodForm, setFoodForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    serving: '100',
    unit: 'g',
    inPantry: true,
  })
  const [savingFood, setSavingFood] = useState(false)

  // Macros
  const [macroGoal, setMacroGoal] = useState<MacroGoal>(DEFAULT_GOAL)
  const [macroCalories, setMacroCalories] = useState('2000')
  const [pctForm, setPctForm] = useState({ protein: '30', carbs: '40', fat: '30' })
  const [savingMacros, setSavingMacros] = useState(false)

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchWeeklyMeals = useCallback(async (monday: Date) => {
    setMealsLoading(true)
    try {
      const res = await fetch(`/api/nutrition/weekly-meals?weekStart=${formatWeekStart(monday)}`)
      if (!res.ok) throw new Error()
      setWeeklyMeals(await res.json())
    } catch {
      toast.error('Error al cargar el plan semanal')
    } finally {
      setMealsLoading(false)
    }
  }, [])

  const fetchFoods = useCallback(async () => {
    setFoodsLoading(true)
    try {
      const res = await fetch('/api/nutrition/foods')
      if (!res.ok) throw new Error()
      setFoods(await res.json())
    } catch {
      toast.error('Error al cargar alimentos')
    } finally {
      setFoodsLoading(false)
    }
  }, [])

  const fetchMacroGoal = useCallback(async () => {
    try {
      const res = await fetch('/api/nutrition/macro-goal')
      if (!res.ok) return
      const data = await res.json()
      if (data) {
        setMacroGoal(data)
        setMacroCalories(String(data.calories))
        // Retroalcular porcentajes desde los gramos guardados
        const cal = data.calories || 1
        const protPct = Math.round((data.protein * 4 / cal) * 100)
        const carbPct = Math.round((data.carbs * 4 / cal) * 100)
        const fatPct = 100 - protPct - carbPct
        setPctForm({
          protein: String(protPct),
          carbs: String(carbPct),
          fat: String(Math.max(0, fatPct)),
        })
      }
    } catch {
      // sin objetivo guardado todavia, usar defaults
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWeeklyMeals(weekStart)
      fetchFoods()
      fetchMacroGoal()
    }
  }, [status, fetchWeeklyMeals, fetchFoods, fetchMacroGoal, weekStart])

  // ---------------------------------------------------------------------------
  // Handlers: Plan semanal
  // ---------------------------------------------------------------------------

  function prevWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
    setAddingMealType(null)
  }

  function nextWeek() {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
    setAddingMealType(null)
  }

  function goToCurrentWeek() {
    setWeekStart(getMonday(new Date()))
    setSelectedDay(getTodayWeekDay())
    setAddingMealType(null)
  }

  function openAddMeal(mealType: MealType) {
    setAddingMealType(mealType)
    setMealForm(EMPTY_MEAL_FORM)
    setSelectedFoodId('')
  }

  function applyFoodToForm(foodId: string) {
    setSelectedFoodId(foodId)
    const food = foods.find((f) => f.id === foodId)
    if (!food) return
    setMealForm((prev) => ({
      ...prev,
      name: prev.name || food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
    }))
  }

  async function submitMeal(e: React.FormEvent) {
    e.preventDefault()
    if (!mealForm.name.trim()) {
      toast.warning('El nombre del platillo no puede estar vacío')
      return
    }
    setSavingMeal(true)
    try {
      const res = await fetch('/api/nutrition/weekly-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekDay: selectedDay,
          mealType: addingMealType,
          name: mealForm.name,
          calories: mealForm.calories || 0,
          protein: mealForm.protein || 0,
          carbs: mealForm.carbs || 0,
          fat: mealForm.fat || 0,
          notes: mealForm.notes || null,
          weekStart: formatWeekStart(weekStart),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al agregar platillo')
        return
      }
      toast.success('Platillo agregado')
      setAddingMealType(null)
      setMealForm(EMPTY_MEAL_FORM)
      fetchWeeklyMeals(weekStart)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSavingMeal(false)
    }
  }

  function deleteMeal(id: string) {
    toast.warning('¿Eliminar este platillo?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await fetch(`/api/nutrition/weekly-meals/${id}`, { method: 'DELETE' })
            fetchWeeklyMeals(weekStart)
            toast.success('Platillo eliminado')
          } catch {
            toast.error('Error al eliminar')
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      classNames: {
        actionButton: '!bg-danger !text-white hover:!bg-danger-hover',
        cancelButton: '!bg-surface-raised !text-text hover:!bg-border',
      },
      duration: 5000,
    })
  }

  // ---------------------------------------------------------------------------
  // Handlers: Alimentos
  // ---------------------------------------------------------------------------

  function openAddFood() {
    setEditingFood(null)
    setFoodForm({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100', unit: 'g', inPantry: true })
    setShowFoodForm(true)
  }

  function openEditFood(food: Food) {
    setEditingFood(food)
    setFoodForm({
      name: food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      serving: String(food.serving),
      unit: food.unit,
      inPantry: food.inPantry,
    })
    setShowFoodForm(true)
  }

  async function submitFood(e: React.FormEvent) {
    e.preventDefault()
    if (!foodForm.name.trim()) {
      toast.warning('El nombre no puede estar vacío')
      return
    }
    setSavingFood(true)
    try {
      const url = editingFood ? `/api/nutrition/foods/${editingFood.id}` : '/api/nutrition/foods'
      const method = editingFood ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodForm),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar alimento')
        return
      }
      toast.success(editingFood ? 'Alimento actualizado' : 'Alimento agregado')
      setShowFoodForm(false)
      setEditingFood(null)
      fetchFoods()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSavingFood(false)
    }
  }

  function deleteFood(id: string) {
    toast.warning('¿Eliminar este alimento?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await fetch(`/api/nutrition/foods/${id}`, { method: 'DELETE' })
            fetchFoods()
            toast.success('Alimento eliminado')
          } catch {
            toast.error('Error al eliminar')
          }
        },
      },
      cancel: { label: 'Cancelar', onClick: () => {} },
      classNames: {
        actionButton: '!bg-danger !text-white hover:!bg-danger-hover',
        cancelButton: '!bg-surface-raised !text-text hover:!bg-border',
      },
      duration: 5000,
    })
  }

  async function togglePantry(food: Food) {
    try {
      await fetch(`/api/nutrition/foods/${food.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inPantry: !food.inPantry }),
      })
      fetchFoods()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers: Macros
  // ---------------------------------------------------------------------------

  async function saveMacroGoal(e: React.FormEvent) {
    e.preventDefault()
    const prot = Number(pctForm.protein) || 0
    const carbs = Number(pctForm.carbs) || 0
    const fat = Number(pctForm.fat) || 0
    if (prot + carbs + fat !== 100) {
      toast.warning('Los porcentajes deben sumar exactamente 100%')
      return
    }
    const cal = Number(macroCalories) || 2000
    const payload = {
      calories: cal,
      protein: Math.round((cal * prot / 100) / 4),
      carbs: Math.round((cal * carbs / 100) / 4),
      fat: Math.round((cal * fat / 100) / 9),
    }
    setSavingMacros(true)
    try {
      const res = await fetch('/api/nutrition/macro-goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMacroGoal(data)
      toast.success('Objetivos guardados')
    } catch {
      toast.error('Error al guardar objetivos')
    } finally {
      setSavingMacros(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const dayMeals = weeklyMeals.filter((m) => m.weekDay === selectedDay)

  const dayTotals = dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Porcentaje de llenado por día para el selector de dias
  const weekDayPercents = WEEK_DAYS.map((day) => {
    const meals = weeklyMeals.filter((m) => m.weekDay === day)
    const cals = meals.reduce((s, m) => s + m.calories, 0)
    return macroPercent(cals, macroGoal.calories)
  })

  const filteredFoods = pantryFilter === 'pantry' ? foods.filter((f) => f.inPantry) : foods

  // ---------------------------------------------------------------------------
  // Guards de sesion
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
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text mb-1">Nutricion</h1>
          <p className="text-text-muted text-sm">
            Planifica tus comidas, gestiona tu despensa y controla tus macros
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface border border-border rounded-xl p-1">
          {(['plan', 'alimentos', 'macros'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              plan: 'Plan Semanal',
              alimentos: 'Alimentos',
              macros: 'Mis Macros',
            }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-accent text-accent-text'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB: PLAN SEMANAL                                                  */}
        {/* ------------------------------------------------------------------ */}
        {tab === 'plan' && (
          <div>
            {/* Navegacion de semana */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevWeek}
                className="p-2 text-text-muted hover:text-text hover:bg-surface-raised rounded-lg transition-colors"
                title="Semana anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              <div className="text-center">
                <p className="text-sm font-semibold text-text">{formatWeekRange(weekStart)}</p>
                {!isCurrentWeek(weekStart) && (
                  <button
                    onClick={goToCurrentWeek}
                    className="text-xs text-accent hover:text-accent-hover transition-colors mt-0.5"
                  >
                    Volver a esta semana
                  </button>
                )}
                {isCurrentWeek(weekStart) && (
                  <p className="text-xs text-text-muted mt-0.5">Semana actual</p>
                )}
              </div>

              <button
                onClick={nextWeek}
                className="p-2 text-text-muted hover:text-text hover:bg-surface-raised rounded-lg transition-colors"
                title="Semana siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Selector de dia */}
            <div className="grid grid-cols-7 gap-1 mb-5">
              {WEEK_DAYS.map((day, i) => {
                const isSelected = day === selectedDay
                const isToday = isCurrentWeek(weekStart) && day === getTodayWeekDay()
                const pct = weekDayPercents[i]
                const mealCount = weeklyMeals.filter((m) => m.weekDay === day).length

                return (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDay(day)
                      setAddingMealType(null)
                    }}
                    className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-accent/15 border-accent/50 text-accent'
                        : isToday
                        ? 'bg-surface border-accent/20 text-text'
                        : 'bg-surface border-border text-text-muted hover:border-border hover:bg-surface-raised'
                    }`}
                  >
                    <span className="text-xs font-semibold">{WEEK_DAY_LABELS[day]}</span>
                    {/* Mini barra de calorías */}
                    <div className="w-full px-1">
                      <div className="h-1 bg-surface-raised rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-danger' : 'bg-accent/60'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {mealCount > 0 && (
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-accent' : 'text-text-muted'}`}>
                        {mealCount} platillo{mealCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isToday && !isSelected && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Secciones de comida del dia seleccionado */}
            {mealsLoading ? (
              <div className="py-10 text-center text-text-muted text-sm">Cargando plan...</div>
            ) : (
              <div className="space-y-3">
                {MEAL_TYPES.map((mealType) => {
                  const mealsForType = dayMeals.filter((m) => m.mealType === mealType)
                  const isAdding = addingMealType === mealType

                  return (
                    <div key={mealType} className="bg-surface border border-border rounded-xl overflow-hidden">
                      {/* Header de la seccion */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{MEAL_TYPE_ICONS[mealType]}</span>
                          <span className="text-sm font-semibold text-text">
                            {MEAL_TYPE_LABELS[mealType]}
                          </span>
                          {mealsForType.length > 0 && (
                            <span className="text-xs text-text-muted">
                              {Math.round(mealsForType.reduce((s, m) => s + m.calories, 0))} kcal
                            </span>
                          )}
                        </div>
                        {!isAdding && (
                          <button
                            onClick={() => openAddMeal(mealType)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 rounded-lg transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Agregar
                          </button>
                        )}
                      </div>

                      {/* Lista de platillos */}
                      {mealsForType.length > 0 && (
                        <ul className="divide-y divide-border/60">
                          {mealsForType.map((meal) => (
                            <li key={meal.id} className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-surface-raised transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text truncate">{meal.name}</p>
                                <div className="flex flex-wrap gap-2 mt-0.5">
                                  {meal.calories > 0 && (
                                    <span className="text-xs text-text-muted">{Math.round(meal.calories)} kcal</span>
                                  )}
                                  {meal.protein > 0 && (
                                    <span className="text-xs text-blue-400">P: {roundMacro(meal.protein)}g</span>
                                  )}
                                  {meal.carbs > 0 && (
                                    <span className="text-xs text-amber-400">C: {roundMacro(meal.carbs)}g</span>
                                  )}
                                  {meal.fat > 0 && (
                                    <span className="text-xs text-rose-400">G: {roundMacro(meal.fat)}g</span>
                                  )}
                                </div>
                                {meal.notes && (
                                  <p className="text-xs text-text-muted mt-0.5 italic">{meal.notes}</p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteMeal(meal.id)}
                                className="p-1.5 text-text-muted hover:text-danger rounded transition-colors flex-shrink-0 mt-0.5"
                                title="Eliminar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Formulario de agregar */}
                      {isAdding && (
                        <form onSubmit={submitMeal} className="px-4 py-3 space-y-3 bg-surface-raised/40">
                          {/* Quick-fill desde despensa */}
                          {foods.filter((f) => f.inPantry).length > 0 && (
                            <div>
                              <label className="text-xs text-text-muted mb-1 block">
                                Rellenar desde despensa (opcional)
                              </label>
                              <select
                                value={selectedFoodId}
                                onChange={(e) => applyFoodToForm(e.target.value)}
                                className="w-full px-3 py-2 bg-surface border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                              >
                                <option value="">Seleccionar alimento...</option>
                                {foods
                                  .filter((f) => f.inPantry)
                                  .map((f) => (
                                    <option key={f.id} value={f.id}>
                                      {f.name} ({Math.round(f.calories)} kcal / {f.serving}{f.unit})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {/* Nombre del platillo */}
                          <input
                            type="text"
                            placeholder="Nombre del platillo *"
                            value={mealForm.name}
                            onChange={(e) => setMealForm((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-surface border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent placeholder:text-text-muted/50"
                            autoFocus
                          />

                          {/* Macros en grid 2x2 */}
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'calories', label: 'Calorías (kcal)', color: '' },
                              { key: 'protein', label: 'Proteínas (g)', color: '' },
                              { key: 'carbs', label: 'Carbohidratos (g)', color: '' },
                              { key: 'fat', label: 'Grasas (g)', color: '' },
                            ].map(({ key, label }) => (
                              <div key={key}>
                                <label className="text-xs text-text-muted mb-0.5 block">{label}</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  placeholder="0"
                                  value={mealForm[key as keyof MealFormState]}
                                  onChange={(e) => setMealForm((p) => ({ ...p, [key]: e.target.value }))}
                                  className="w-full px-3 py-2 bg-surface border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent placeholder:text-text-muted/50"
                                />
                              </div>
                            ))}
                          </div>

                          {/* Notas */}
                          <input
                            type="text"
                            placeholder="Notas (opcional)"
                            value={mealForm.notes}
                            onChange={(e) => setMealForm((p) => ({ ...p, notes: e.target.value }))}
                            className="w-full px-3 py-2 bg-surface border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent placeholder:text-text-muted/50"
                          />

                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setAddingMealType(null)}
                              className="px-3 py-1.5 text-sm text-text-muted hover:text-text bg-surface-raised rounded-lg transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={savingMeal}
                              className="px-4 py-1.5 text-sm font-semibold bg-accent text-accent-text rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                            >
                              {savingMeal ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Estado vacio */}
                      {mealsForType.length === 0 && !isAdding && (
                        <div className="px-4 py-3 text-xs text-text-muted">
                          Sin platillos planificados
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Resumen de macros del dia */}
            {!mealsLoading && dayMeals.length > 0 && (
              <div className="mt-4 bg-surface border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-text">
                  Resumen del dia — {WEEK_DAY_LABELS[selectedDay]}
                </p>
                <CalorieBar value={dayTotals.calories} goal={macroGoal.calories} />
                <div className="grid grid-cols-3 gap-3">
                  <MacroBar label="Proteinas" value={dayTotals.protein} goal={macroGoal.protein} color="bg-blue-400" />
                  <MacroBar label="Carbohidratos" value={dayTotals.carbs} goal={macroGoal.carbs} color="bg-amber-400" />
                  <MacroBar label="Grasas" value={dayTotals.fat} goal={macroGoal.fat} color="bg-rose-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB: ALIMENTOS                                                     */}
        {/* ------------------------------------------------------------------ */}
        {tab === 'alimentos' && (
          <div>
            {/* Header de seccion */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
                <button
                  onClick={() => setPantryFilter('all')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${pantryFilter === 'all' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'}`}
                >
                  Todos ({foods.length})
                </button>
                <button
                  onClick={() => setPantryFilter('pantry')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${pantryFilter === 'pantry' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'}`}
                >
                  En despensa ({foods.filter((f) => f.inPantry).length})
                </button>
              </div>

              <button
                onClick={openAddFood}
                className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Agregar
              </button>
            </div>

            {/* Formulario de alimento */}
            {showFoodForm && (
              <form onSubmit={submitFood} className="mb-4 bg-surface border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-text">
                  {editingFood ? 'Editar alimento' : 'Nuevo alimento'}
                </p>

                <input
                  type="text"
                  placeholder="Nombre del alimento *"
                  value={foodForm.name}
                  onChange={(e) => setFoodForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent placeholder:text-text-muted/50"
                  autoFocus
                />

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'calories', label: 'Calorías (kcal)' },
                    { key: 'protein', label: 'Proteinas (g)' },
                    { key: 'carbs', label: 'Carbohidratos (g)' },
                    { key: 'fat', label: 'Grasas (g)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-text-muted mb-0.5 block">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={foodForm[key as keyof typeof foodForm] as string}
                        onChange={(e) => setFoodForm((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface-raised border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent placeholder:text-text-muted/50"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-text-muted mb-0.5 block">Porcion</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={foodForm.serving}
                      onChange={(e) => setFoodForm((p) => ({ ...p, serving: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-raised border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-text-muted mb-0.5 block">Unidad</label>
                    <select
                      value={foodForm.unit}
                      onChange={(e) => setFoodForm((p) => ({ ...p, unit: e.target.value }))}
                      className="w-full px-3 py-2 bg-surface-raised border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="unidad">unidad</option>
                      <option value="taza">taza</option>
                      <option value="cdta">cdta</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      id="inPantry"
                      checked={foodForm.inPantry}
                      onChange={(e) => setFoodForm((p) => ({ ...p, inPantry: e.target.checked }))}
                      className="w-4 h-4 rounded accent-accent"
                    />
                    <label htmlFor="inPantry" className="text-sm text-text-muted whitespace-nowrap">
                      En despensa
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowFoodForm(false); setEditingFood(null) }}
                    className="px-3 py-1.5 text-sm text-text-muted hover:text-text bg-surface-raised rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingFood}
                    className="px-4 py-1.5 text-sm font-semibold bg-accent text-accent-text rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {savingFood ? 'Guardando...' : editingFood ? 'Actualizar' : 'Agregar'}
                  </button>
                </div>
              </form>
            )}

            {/* Lista de alimentos */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {foodsLoading ? (
                <div className="py-10 text-center text-text-muted text-sm">Cargando alimentos...</div>
              ) : filteredFoods.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-text-muted text-sm">
                    {pantryFilter === 'pantry'
                      ? 'No hay alimentos en la despensa'
                      : 'No has agregado alimentos todavia'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredFoods.map((food) => (
                    <li key={food.id} className="px-4 py-3 hover:bg-surface-raised transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text">{food.name}</span>
                            <button
                              onClick={() => togglePantry(food)}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                                food.inPantry
                                  ? 'bg-success/20 text-success hover:bg-success/30'
                                  : 'bg-surface-raised text-text-muted hover:bg-border'
                              }`}
                              title={food.inPantry ? 'Quitar de despensa' : 'Agregar a despensa'}
                            >
                              {food.inPantry ? 'En despensa' : 'Sin stock'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            <span className="text-xs text-text-muted">
                              {Math.round(food.calories)} kcal / {food.serving}{food.unit}
                            </span>
                            <span className="text-xs text-blue-400">P: {food.protein}g</span>
                            <span className="text-xs text-amber-400">C: {food.carbs}g</span>
                            <span className="text-xs text-rose-400">G: {food.fat}g</span>
                          </div>
                        </div>

                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditFood(food)}
                            className="p-1.5 text-text-muted hover:text-accent rounded transition-colors"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteFood(food.id)}
                            className="p-1.5 text-text-muted hover:text-danger rounded transition-colors"
                            title="Eliminar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {filteredFoods.length > 0 && (
              <p className="mt-2 text-center text-xs text-text-muted">
                {filteredFoods.length} alimento{filteredFoods.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB: MIS MACROS                                                    */}
        {/* ------------------------------------------------------------------ */}
        {tab === 'macros' && (
          <div className="space-y-5">
            {/* Objetivos diarios */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text mb-4">Objetivos diarios</h2>

              <form onSubmit={saveMacroGoal} className="space-y-5">
                {/* Calorías */}
                <div>
                  <label className="text-xs font-medium text-text mb-1 block">Calorías objetivo (kcal/dia)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={macroCalories}
                    onChange={(e) => setMacroCalories(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-raised border border-border text-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                </div>

                {/* Distribucion por porcentaje */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-text">Distribucion de macros</span>
                    {(() => {
                      const sum = (Number(pctForm.protein) || 0) + (Number(pctForm.carbs) || 0) + (Number(pctForm.fat) || 0)
                      return (
                        <span className={`text-xs font-semibold ${sum === 100 ? 'text-success' : 'text-danger'}`}>
                          {sum}% / 100%
                        </span>
                      )
                    })()}
                  </div>

                  {/* Barra de preview en vivo */}
                  {(() => {
                    const prot = Math.max(0, Number(pctForm.protein) || 0)
                    const carbs = Math.max(0, Number(pctForm.carbs) || 0)
                    const fat = Math.max(0, Number(pctForm.fat) || 0)
                    const cal = Number(macroCalories) || 2000
                    return (
                      <div className="space-y-3">
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
                          <div className="bg-blue-400 transition-all duration-200" style={{ width: `${prot}%` }} />
                          <div className="bg-amber-400 transition-all duration-200" style={{ width: `${carbs}%` }} />
                          <div className="bg-rose-400 transition-all duration-200" style={{ width: `${fat}%` }} />
                        </div>

                        {[
                          { key: 'protein', label: 'Proteinas', color: 'bg-blue-400', calPerG: 4 },
                          { key: 'carbs', label: 'Carbohidratos', color: 'bg-amber-400', calPerG: 4 },
                          { key: 'fat', label: 'Grasas', color: 'bg-rose-400', calPerG: 9 },
                        ].map(({ key, label, color, calPerG }) => {
                          const pct = Number(pctForm[key as keyof typeof pctForm]) || 0
                          const grams = Math.round((cal * pct / 100) / calPerG)
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                              <span className="text-xs text-text-muted w-24 flex-shrink-0">{label}</span>
                              <div className="flex items-center gap-1.5 flex-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={pctForm[key as keyof typeof pctForm]}
                                  onChange={(e) => setPctForm((p) => ({ ...p, [key]: e.target.value }))}
                                  className="w-16 px-2 py-1.5 bg-surface-raised border border-border text-text rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                                />
                                <span className="text-xs text-text-muted">%</span>
                              </div>
                              <span className="text-xs font-medium text-text w-16 text-right">
                                = {grams}g
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                <button
                  type="submit"
                  disabled={savingMacros}
                  className="w-full py-2.5 bg-accent text-accent-text font-semibold rounded-lg hover:bg-accent-hover transition-colors text-sm disabled:opacity-50"
                >
                  {savingMacros ? 'Guardando...' : 'Guardar objetivos'}
                </button>
              </form>
            </div>

            {/* Distribucion de macros (solo lectura, refleja lo guardado) */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-text mb-4">Objetivos actuales</h2>

              {(() => {
                const protCal = macroGoal.protein * 4
                const carbCal = macroGoal.carbs * 4
                const fatCal = macroGoal.fat * 9
                const total = protCal + carbCal + fatCal || 1

                const prot = Math.round((protCal / total) * 100)
                const carbs = Math.round((carbCal / total) * 100)
                const fat = 100 - prot - carbs

                return (
                  <div className="space-y-3">
                    <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                      <div className="bg-blue-400" style={{ width: `${prot}%` }} />
                      <div className="bg-amber-400" style={{ width: `${carbs}%` }} />
                      <div className="bg-rose-400" style={{ width: `${fat}%` }} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Proteinas', color: 'bg-blue-400', pct: prot, g: macroGoal.protein },
                        { label: 'Carbohidratos', color: 'bg-amber-400', pct: carbs, g: macroGoal.carbs },
                        { label: 'Grasas', color: 'bg-rose-400', pct: fat, g: macroGoal.fat },
                      ].map(({ label, color, pct, g }) => (
                        <div key={label}>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <span className={`w-2 h-2 rounded-full ${color} inline-block`} />
                            <span className="text-xs text-text-muted">{label}</span>
                          </div>
                          <p className="text-sm font-semibold text-text">{pct}%</p>
                          <p className="text-xs text-text-muted">{g}g</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-1 border-t border-border/60 text-center">
                      <p className="text-xs text-text-muted">
                        Objetivo calorico: <span className="font-semibold text-text">{macroGoal.calories} kcal/dia</span>
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Resumen de la semana actual */}
            {(() => {
              const thisWeekMeals = weeklyMeals
              if (thisWeekMeals.length === 0) return null

              const weekTotals = thisWeekMeals.reduce(
                (acc, m) => ({
                  calories: acc.calories + m.calories,
                  protein: acc.protein + m.protein,
                  carbs: acc.carbs + m.carbs,
                  fat: acc.fat + m.fat,
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
              )

              const daysPlanned = new Set(thisWeekMeals.map((m) => m.weekDay)).size

              return (
                <div className="bg-surface border border-border rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-text mb-1">Esta semana</h2>
                  <p className="text-xs text-text-muted mb-4">
                    {daysPlanned} dia{daysPlanned !== 1 ? 's' : ''} planificado{daysPlanned !== 1 ? 's' : ''}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total calorias', value: `${Math.round(weekTotals.calories)} kcal`, sub: `~${Math.round(weekTotals.calories / daysPlanned)} kcal/dia` },
                      { label: 'Total proteinas', value: `${roundMacro(weekTotals.protein)}g`, sub: `~${roundMacro(weekTotals.protein / daysPlanned)}g/dia` },
                      { label: 'Total carbohidratos', value: `${roundMacro(weekTotals.carbs)}g`, sub: `~${roundMacro(weekTotals.carbs / daysPlanned)}g/dia` },
                      { label: 'Total grasas', value: `${roundMacro(weekTotals.fat)}g`, sub: `~${roundMacro(weekTotals.fat / daysPlanned)}g/dia` },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="bg-surface-raised rounded-lg p-3">
                        <p className="text-xs text-text-muted mb-1">{label}</p>
                        <p className="text-lg font-bold text-text">{value}</p>
                        <p className="text-xs text-text-muted">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
