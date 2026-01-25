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
      where: { id },  // ← Usar id directamente
      data: { completed: body.completed }
    })
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// DELETE: Eliminar tarea específica por ID
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    await prisma.task.delete({
      where: { id }
    })
    
    return NextResponse.json({ message: 'Tarea eliminada' }, { status: 200 })
  } catch (error) {
    console.error('Error al eliminar:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
