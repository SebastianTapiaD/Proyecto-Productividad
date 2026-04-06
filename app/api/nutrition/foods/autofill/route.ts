import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

const prisma = new PrismaClient()
const MAX_DAILY_AUTOFILL = 20

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const userId = session.user.id
  const today = new Date().toISOString().split('T')[0]

  const usageLog = await prisma.aiUsageLog.findUnique({
    where: { userId_date_type: { userId, date: today, type: 'autofill' } },
  })

  if (usageLog && usageLog.count >= MAX_DAILY_AUTOFILL) {
    return NextResponse.json(
      { error: `Limite de ${MAX_DAILY_AUTOFILL} autocompletados diarios alcanzado. Vuelve manana.` },
      { status: 429 }
    )
  }

  const body = await request.json()
  const name: string = String(body.name ?? '').trim().slice(0, 100)
  const unit: string = String(body.unit ?? 'g').trim().slice(0, 10)

  if (!name) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Servicio de IA no configurado' }, { status: 503 })
  }

  const prompt = `Provide the nutritional values for "${name.replace(/"/g, '')}" per 100${unit}.
Return ONLY a valid JSON object with no markdown, no explanation:
{"calories":0,"protein":0,"carbs":0,"fat":0}
Use realistic values from common nutritional databases. All values must be numbers.`

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) throw new Error('Respuesta invalida del modelo')

    const parsed = JSON.parse(jsonMatch[0])

    await prisma.aiUsageLog.upsert({
      where: { userId_date_type: { userId, date: today, type: 'autofill' } },
      create: { userId, date: today, type: 'autofill', count: 1 },
      update: { count: { increment: 1 } },
    })

    const remaining = MAX_DAILY_AUTOFILL - ((usageLog?.count ?? 0) + 1)

    return NextResponse.json({
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round((Number(parsed.protein) || 0) * 10) / 10,
      carbs: Math.round((Number(parsed.carbs) || 0) * 10) / 10,
      fat: Math.round((Number(parsed.fat) || 0) * 10) / 10,
      remaining,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[foods/autofill] Error:', message)
    return NextResponse.json(
      { error: `No se pudieron estimar los macros: ${message}` },
      { status: 500 }
    )
  }
}
