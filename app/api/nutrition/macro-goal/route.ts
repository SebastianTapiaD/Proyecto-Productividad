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

    const goal = await prisma.macroGoal.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error al obtener objetivo de macros:', error)
    return NextResponse.json({ error: 'Error al obtener objetivo' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()

    const goal = await prisma.macroGoal.upsert({
      where: { userId: session.user.id },
      update: {
        calories: Number(body.calories) || 2000,
        protein: Number(body.protein) || 150,
        carbs: Number(body.carbs) || 200,
        fat: Number(body.fat) || 65,
      },
      create: {
        calories: Number(body.calories) || 2000,
        protein: Number(body.protein) || 150,
        carbs: Number(body.carbs) || 200,
        fat: Number(body.fat) || 65,
        userId: session.user.id,
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error al guardar objetivo de macros:', error)
    return NextResponse.json({ error: 'Error al guardar objetivo' }, { status: 500 })
  }
}
