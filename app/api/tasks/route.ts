import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'                   
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await auth() 

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'El título no puede estar vacío' },
        { status: 400 }
      )
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        title: body.title.trim(),
        userId: session.user.id  // ← userId de sesión
      }
    })
    
    if (existingTask) {
      return NextResponse.json(
        { error: 'Ya existe una tarea con ese título' },
        { status: 409 }
      )
    }

    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        userId: session.user.id  // ← userId de sesión
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}
