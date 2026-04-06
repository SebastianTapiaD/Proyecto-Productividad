import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const food = await prisma.food.findUnique({ where: { id } })

    if (!food || food.userId !== session.user.id) {
      return NextResponse.json({ error: 'Alimento no encontrado' }, { status: 404 })
    }

    const updated = await prisma.food.update({
      where: { id },
      data: {
        name: body.name?.trim() ?? food.name,
        calories: body.calories !== undefined ? Number(body.calories) : food.calories,
        protein: body.protein !== undefined ? Number(body.protein) : food.protein,
        carbs: body.carbs !== undefined ? Number(body.carbs) : food.carbs,
        fat: body.fat !== undefined ? Number(body.fat) : food.fat,
        stockQuantity: body.stockQuantity !== undefined ? Number(body.stockQuantity) : food.stockQuantity,
        unit: body.unit?.trim() ?? food.unit,
        inPantry: body.inPantry !== undefined ? Boolean(body.inPantry) : food.inPantry,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error al actualizar alimento:', error)
    return NextResponse.json({ error: 'Error al actualizar alimento' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await context.params

    const food = await prisma.food.findUnique({ where: { id } })

    if (!food || food.userId !== session.user.id) {
      return NextResponse.json({ error: 'Alimento no encontrado' }, { status: 404 })
    }

    await prisma.food.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar alimento:', error)
    return NextResponse.json({ error: 'Error al eliminar alimento' }, { status: 500 })
  }
}
