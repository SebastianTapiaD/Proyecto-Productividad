import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient, MealType, WeekDay } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weekStartParam = searchParams.get('weekStart')

    if (!weekStartParam) {
      return NextResponse.json({ error: 'Se requiere weekStart' }, { status: 400 })
    }

    // Buscar comidas dentro del rango del lunes (00:00:00) al domingo (23:59:59)
    const weekStartDate = new Date(weekStartParam + 'T00:00:00.000Z')
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    const meals = await prisma.weeklyMeal.findMany({
      where: {
        userId: session.user.id,
        weekStart: {
          gte: weekStartDate,
          lt: weekEndDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(meals)
  } catch (error) {
    console.error('Error al obtener comidas:', error)
    return NextResponse.json({ error: 'Error al obtener comidas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
    }

    if (!body.weekDay || !body.mealType || !body.weekStart) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const weekStartDate = new Date(body.weekStart + 'T00:00:00.000Z')

    const meal = await prisma.weeklyMeal.create({
      data: {
        weekDay: body.weekDay as WeekDay,
        mealType: body.mealType as MealType,
        name: body.name.trim(),
        calories: Number(body.calories) || 0,
        protein: Number(body.protein) || 0,
        carbs: Number(body.carbs) || 0,
        fat: Number(body.fat) || 0,
        notes: body.notes?.trim() || null,
        weekStart: weekStartDate,
        userId: session.user.id,
      },
    })

    return NextResponse.json(meal, { status: 201 })
  } catch (error) {
    console.error('Error al crear comida:', error)
    return NextResponse.json({ error: 'Error al crear comida' }, { status: 500 })
  }
}
