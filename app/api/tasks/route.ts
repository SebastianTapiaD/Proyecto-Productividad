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

    // Obtener todas las tareas del usuario
    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })

    // Procesar cada tarea para verificar si necesita reset
    const now = new Date()
    const processedTasks = await Promise.all(
      tasks.map(async (task) => {
        // Solo verificar tareas que están completadas y tienen fecha de última completación
        if (task.completed && task.lastCompletedAt) {
          
          // Calcular días transcurridos (solo fechas, ignorando horas)
          const daysPassed = getDaysDifference(task.lastCompletedAt, now)
          
          // Si ya pasó el ciclo, resetear automáticamente
          if (daysPassed >= task.cycleInDays) {
            const updatedTask = await prisma.task.update({
              where: { id: task.id },
              data: { 
                completed: false,
                lastCompletedAt: null  // Resetear la fecha
              },
              include: { user: true }
            })
            return updatedTask
          }
        }
        
        // Si no necesita reset, devolver la tarea sin cambios
        return task
      })
    )

    return NextResponse.json(processedTasks)
  } catch (error) {
    console.error('Error al obtener tareas:', error)
    return NextResponse.json({ error: 'Error al obtener tareas' }, { status: 500 })
  }
}

//Función helper: calcula diferencia en días (solo fechas, sin horas)
function getDaysDifference(date1: Date, date2: Date): number {
  // Crear copias para no modificar las originales
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  // Resetear las horas a medianoche (00:00:00.000)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  
  // Calcular diferencia en milisegundos
  const diffMs = d2.getTime() - d1.getTime()
  
  // Convertir a días (1 día = 86,400,000 milisegundos)
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  return days
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
        userId: session.user.id
      }
    })
    
    if (existingTask) {
      return NextResponse.json(
        { error: 'Ya existe una tarea con ese título' },
        { status: 409 }
      )
    }

    // Agregar cycleInDays al crear la tarea
    const task = await prisma.task.create({
      data: {
        title: body.title.trim(),
        userId: session.user.id,
        cycleInDays: body.cycleInDays || 1
      }
    })
    
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}
