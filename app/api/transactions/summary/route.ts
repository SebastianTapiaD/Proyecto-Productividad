import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/transactions/summary?year=2025
// Devuelve un resumen agregado por mes para los 12 meses del año indicado
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10)

    const startDate = new Date(Date.UTC(year, 0, 1))     // 1 enero UTC
    const endDate   = new Date(Date.UTC(year + 1, 0, 1)) // 1 enero del año siguiente UTC

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: startDate, lt: endDate },
      },
      select: { type: true, amount: true, date: true },
    })

    // Agrupar por mes
    const map: Record<number, { income: number; expenses: number }> = {}

    for (const t of transactions) {
      const monthIndex = new Date(t.date).getUTCMonth()
      if (!map[monthIndex]) map[monthIndex] = { income: 0, expenses: 0 }
      if (t.type === 'INCOME') map[monthIndex].income += t.amount
      else map[monthIndex].expenses += t.amount
    }

    // Construir los 12 meses del año (incluyendo los vacíos)
    const months = Array.from({ length: 12 }, (_, i) => {
      const { income, expenses } = map[i] ?? { income: 0, expenses: 0 }
      return {
        key: `${year}-${String(i + 1).padStart(2, '0')}`,
        year,
        month: i,
        income,
        expenses,
        balance: income - expenses,
      }
    })

    return NextResponse.json({ months })
  } catch (error) {
    console.error('Error al obtener resumen:', error)
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 })
  }
}
