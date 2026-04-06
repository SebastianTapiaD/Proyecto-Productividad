import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const foods = await prisma.food.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(foods)
  } catch (error) {
    console.error('Error al obtener alimentos:', error)
    return NextResponse.json({ error: 'Error al obtener alimentos' }, { status: 500 })
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

    const existing = await prisma.food.findFirst({
      where: { name: body.name.trim(), userId: session.user.id },
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un alimento con ese nombre' }, { status: 409 })
    }

    const food = await prisma.food.create({
      data: {
        name: body.name.trim(),
        calories: Number(body.calories) || 0,
        protein: Number(body.protein) || 0,
        carbs: Number(body.carbs) || 0,
        fat: Number(body.fat) || 0,
        stockQuantity: Number(body.stockQuantity) || 0,
        unit: body.unit?.trim() || 'g',
        inPantry: body.inPantry !== false,
        userId: session.user.id,
      },
    })

    return NextResponse.json(food, { status: 201 })
  } catch (error) {
    console.error('Error al crear alimento:', error)
    return NextResponse.json({ error: 'Error al crear alimento' }, { status: 500 })
  }
}
