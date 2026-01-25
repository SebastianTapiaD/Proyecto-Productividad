import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT: Actualizar tarea específica por ID
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params  // ← Await aquí
    const body = await request.json()
    
    const task = await prisma.task.update({
      where: { id },  // ← Usa id directamente
      data: { completed: body.completed }
    })
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
