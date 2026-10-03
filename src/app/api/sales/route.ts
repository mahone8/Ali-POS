import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/sales - list sales (most recent first)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? 100)

    const sales = await db.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
    })
    return NextResponse.json(sales)
  } catch (e) {
    console.error('[GET /api/sales]', e)
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 })
  }
}

// POST /api/sales - create a sale (checkout)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items, // [{ articleId, sku, name, category, size, color, price, quantity }]
      customerName,
      customerPhone,
      taxRate = 0,
      discount = 0,
      paymentMethod = 'Cash',
      paidAmount = 0,
    } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // compute subtotal
    const subtotal = items.reduce(
      (sum: number, it: any) => sum + Number(it.price) * Number(it.quantity),
      0
    )
    const taxAmount = +(subtotal * Number(taxRate)).toFixed(2)
    const total = +(subtotal + taxAmount - Number(discount)).toFixed(2)

    // generate receipt number: RCP-YYYYMMDD-XXXX
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const countToday = await db.sale.count({
      where: { createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
    })
    const receiptNo = `RCP-${dateStr}-${String(countToday + 1).padStart(4, '0')}`

    // create sale in a transaction so stock is decremented atomically
    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          receiptNo,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          subtotal: +subtotal.toFixed(2),
          taxRate: Number(taxRate),
          taxAmount,
          discount: Number(discount),
          total,
          paymentMethod: String(paymentMethod),
          paidAmount: Number(paidAmount),
          changeAmount: +Math.max(0, Number(paidAmount) - total).toFixed(2),
          items: {
            create: items.map((it: any) => ({
              articleId: it.articleId || null,
              sku: it.sku,
              name: it.name,
              category: it.category || '',
              size: it.size || '',
              color: it.color || null,
              price: Number(it.price),
              quantity: Number(it.quantity),
              subtotal: +(Number(it.price) * Number(it.quantity)).toFixed(2),
            })),
          },
        },
        include: { items: true },
      })

      // decrement stock for each article
      for (const it of items) {
        if (it.articleId) {
          await tx.article.update({
            where: { id: it.articleId },
            data: { stock: { decrement: Number(it.quantity) } },
          })
        }
      }
      return newSale
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (e) {
    console.error('[POST /api/sales]', e)
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
  }
}
