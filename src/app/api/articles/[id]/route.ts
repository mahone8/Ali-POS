import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/articles/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await db.article.findUnique({ where: { id } })
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(article)
  } catch (e) {
    console.error('[GET /api/articles/[id]]', e)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}

// PUT /api/articles/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { sku, name, category, brand, size, color, price, cost, stock } = body

    const existing = await db.article.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If SKU changes, ensure uniqueness
    if (sku && sku !== existing.sku) {
      const clash = await db.article.findUnique({ where: { sku } })
      if (clash) return NextResponse.json({ error: 'SKU already in use' }, { status: 409 })
    }

    const updated = await db.article.update({
      where: { id },
      data: {
        sku: sku !== undefined ? String(sku).trim() : undefined,
        name: name !== undefined ? String(name).trim() : undefined,
        category: category !== undefined ? String(category).trim() : undefined,
        brand: brand !== undefined ? (brand ? String(brand).trim() : null) : undefined,
        size: size !== undefined ? String(size).trim() : undefined,
        color: color !== undefined ? (color ? String(color).trim() : null) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PUT /api/articles/[id]]', e)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

// DELETE /api/articles/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.article.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.article.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/articles/[id]]', e)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
