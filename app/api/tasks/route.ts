import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET: Obtener todas las tareas
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

// POST: Crear nueva tarea
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const task = await prisma.task.create({
      data: {
        title: body.title,
        userId: body.userId
      }
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}
