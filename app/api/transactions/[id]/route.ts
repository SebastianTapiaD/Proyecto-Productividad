import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT /api/transactions/[id]
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    const existing = await prisma.transaction.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.type !== undefined) {
      if (!['INCOME', 'EXPENSE'].includes(body.type)) {
        return NextResponse.json({ error: 'Tipo de transacción inválido' }, { status: 400 })
      }
      updateData.type = body.type
    }

    if (body.amount !== undefined) {
      if (typeof body.amount !== 'number' || body.amount <= 0) {
        return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
      }
      updateData.amount = Math.round(body.amount)
    }

    if (body.category !== undefined) {
      if (!body.category.trim()) {
        return NextResponse.json({ error: 'La categoría no puede estar vacía' }, { status: 400 })
      }
      updateData.category = body.category.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.date !== undefined) {
      updateData.date = new Date(body.date)
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error al actualizar transacción:', error)
    return NextResponse.json({ error: 'Error al actualizar transacción' }, { status: 500 })
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await context.params

    const existing = await prisma.transaction.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await prisma.transaction.delete({ where: { id } })

    return NextResponse.json({ message: 'Transacción eliminada' })
  } catch (error) {
    console.error('Error al eliminar transacción:', error)
    return NextResponse.json({ error: 'Error al eliminar transacción' }, { status: 500 })
  }
}
