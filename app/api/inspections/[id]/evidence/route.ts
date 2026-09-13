import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { uploadEvidence, getEvidenceByInspectionId } from '@/lib/services/evidence/evidenceService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params
    const userSession = await getSessionUser()

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided in request' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const evidence = await uploadEvidence(
      {
        inspectionId,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        buffer,
        uploadedUserId: userSession?.id,
      },
      userSession
    )

    return NextResponse.json({
      success: true,
      data: evidence,
    })
  } catch (error: any) {
    console.error('API /api/inspections/[id]/evidence POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload evidence file' },
      { status: error?.status || 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inspectionId } = await params
    const userSession = await getSessionUser()

    const items = await getEvidenceByInspectionId(inspectionId, userSession)

    return NextResponse.json({
      success: true,
      data: items,
      meta: { count: items.length },
    })
  } catch (error: any) {
    console.error('API /api/inspections/[id]/evidence GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch inspection evidence' },
      { status: error?.status || 500 }
    )
  }
}
