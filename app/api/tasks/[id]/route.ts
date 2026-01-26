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
    
    // Construir objeto de actualización
    const updateData: any = {}
    
    if (body.completed !== undefined) {
      updateData.completed = body.completed
    }
    
    if (body.title !== undefined) {
      // Validar que el título no esté vacío
      if (!body.title.trim()) {
        return NextResponse.json(
          { error: 'El título no puede estar vacío' },
          { status: 400 }
        )
      }
      
      // Obtener la tarea actual para saber su userId
      const currentTask = await prisma.task.findUnique({
        where: { id }
      })
      
      if (!currentTask) {
        return NextResponse.json(
          { error: 'Tarea no encontrada' },
          { status: 404 }
        )
      }
      
      // Verificar si ya existe otra tarea con ese título
      const existingTask = await prisma.task.findFirst({
        where: {
          title: body.title.trim(),
          userId: currentTask.userId,
          NOT: { id } // Excluir la tarea actual
        }
      })
      
      if (existingTask) {
        return NextResponse.json(
          { error: 'Ya existe otra tarea con ese título' },
          { status: 409 }
        )
      }
      
      updateData.title = body.title.trim()
    }
    
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
