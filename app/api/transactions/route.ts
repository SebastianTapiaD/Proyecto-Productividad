import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/transactions?month=2026-04
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // formato: "2026-04"

    let startDate: Date
    let endDate: Date

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split('-').map(Number)
      startDate = new Date(Date.UTC(year, month - 1, 1))
      endDate = new Date(Date.UTC(year, month, 1))
    } else {
      // Mes actual por defecto
      const now = new Date()
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate, lt: endDate },
      },
      orderBy: { date: 'desc' },
    })

    // Calcular resumen
    let totalIncome = 0
    let totalExpenses = 0

    for (const t of transactions) {
      if (t.type === 'INCOME') totalIncome += t.amount
      else totalExpenses += t.amount
    }

    return NextResponse.json({
      transactions,
      summary: {
        income: totalIncome,
        expenses: totalExpenses,
        balance: totalIncome - totalExpenses,
      },
    })
  } catch (error) {
    console.error('Error al obtener transacciones:', error)
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 })
  }
}

// POST /api/transactions
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.type || !['INCOME', 'EXPENSE'].includes(body.type)) {
      return NextResponse.json({ error: 'Tipo de transacción inválido' }, { status: 400 })
    }

    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    if (!body.category || !body.category.trim()) {
      return NextResponse.json({ error: 'La categoría no puede estar vacía' }, { status: 400 })
    }

    if (!body.date) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: body.type,
        amount: Math.round(body.amount),
        category: body.category.trim(),
        description: body.description?.trim() || null,
        date: new Date(body.date),
        userId: session.user.id,
      },
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Error al crear transacción:', error)
    return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 })
  }
}
