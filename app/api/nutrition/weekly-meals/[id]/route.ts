import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    const meal = await prisma.weeklyMeal.findUnique({ where: { id } })

    if (!meal || meal.userId !== session.user.id) {
      return NextResponse.json({ error: 'Comida no encontrada' }, { status: 404 })
    }

    await prisma.weeklyMeal.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error al eliminar comida:', error)
    return NextResponse.json({ error: 'Error al eliminar comida' }, { status: 500 })
  }
}
