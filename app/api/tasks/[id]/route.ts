import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT: Actualizar tarea específica por ID
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    
    // Construir objeto de actualización dinámicamente
    const updateData: any = {}
    if (body.completed !== undefined) updateData.completed = body.completed
    if (body.title !== undefined) updateData.title = body.title
    
    const task = await prisma.task.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error al actualizar:', error)
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
