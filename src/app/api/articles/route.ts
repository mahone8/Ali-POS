import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/articles - list all articles (with optional search)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q')?.trim()

    const articles = await db.article.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
              { category: { contains: search } },
              { brand: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(articles)
  } catch (e) {
    console.error('[GET /api/articles]', e)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}

// POST /api/articles - create a new article
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sku, name, category, brand, size, color, price, cost, stock } = body

    if (!sku || !name || !category || !size || price == null) {
      return NextResponse.json(
        { error: 'Missing required fields: sku, name, category, size, price' },
        { status: 400 }
      )
    }

    const existing = await db.article.findUnique({ where: { sku } })
    if (existing) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 })
    }

    const article = await db.article.create({
      data: {
        sku: String(sku).trim(),
        name: String(name).trim(),
        category: String(category).trim(),
        brand: brand ? String(brand).trim() : null,
        size: String(size).trim(),
        color: color ? String(color).trim() : null,
        price: Number(price),
        cost: Number(cost ?? 0),
        stock: Number(stock ?? 0),
      },
    })
    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    console.error('[POST /api/articles]', e)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
