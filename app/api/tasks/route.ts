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
    
    // Validar que el título no esté vacío
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: 'El título no puede estar vacío' },
        { status: 400 }
      )
    }
    
    // Verificar si ya existe una tarea con ese título para este usuario
    const existingTask = await prisma.task.findFirst({
      where: {
        title: body.title.trim(),
        userId: body.userId
      }
    })
    
    if (existingTask) {
      return NextResponse.json(
        { error: 'Ya existe una tarea con ese título' },
        { status: 409 } // 409 = Conflict
      )
    }
    
    // Si no existe, crear la tarea
    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        userId: body.userId
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}