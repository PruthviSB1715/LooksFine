import { NextResponse } from 'next/server'
import { getEstablishmentById } from '@/lib/services/establishmentService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const establishment = await getEstablishmentById(id)

    if (!establishment) {
      return NextResponse.json({ error: 'Establishment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: establishment })
  } catch (error) {
    console.error('API /api/establishments/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch establishment details' }, { status: 500 })
  }
}
