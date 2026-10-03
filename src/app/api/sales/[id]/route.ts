import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sales/[id] - fetch a single sale with items (for receipt printing)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sale = await db.sale.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!sale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(sale)
  } catch (e) {
    console.error('[GET /api/sales/[id]]', e)
    return NextResponse.json({ error: 'Failed to fetch sale' }, { status: 500 })
  }
}
