import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats - dashboard summary
export async function GET() {
  try {
    const totalArticles = await db.article.count()
    const totalStock = await db.article.aggregate({ _sum: { stock: true } })
    const lowStockArticles = await db.article.findMany({
      where: { stock: { lte: 5 } },
      orderBy: { stock: 'asc' },
      take: 10,
    })

    // sales aggregation (all time)
    const salesAgg = await db.sale.aggregate({
      _sum: { total: true, subtotal: true },
      _count: { id: true },
    })

    // last 7 days sales (for chart)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const recentSales = await db.sale.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // bucket by day
    const dayMap = new Map<string, { date: string; total: number; count: number }>()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const key = fmt(d)
      dayMap.set(key, { date: key, total: 0, count: 0 })
    }
    for (const s of recentSales) {
      const key = fmt(s.createdAt)
      const bucket = dayMap.get(key)
      if (bucket) {
        bucket.total += s.total
        bucket.count += 1
      }
    }

    // top selling articles (by quantity sold)
    const topItems = await db.saleItem.groupBy({
      by: ['articleId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })
    const topArticleIds = topItems.map((t) => t.articleId).filter(Boolean) as string[]
    const topArticles = await db.article.findMany({
      where: { id: { in: topArticleIds } },
      select: { id: true, name: true, sku: true },
    })
    const topSelling = topItems.map((t) => {
      const a = topArticles.find((x) => x.id === t.articleId)
      return {
        name: a?.name ?? 'Unknown',
        sku: a?.sku ?? '',
        qty: t._sum.quantity ?? 0,
      }
    })

    const recentReceipts = await db.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: true },
    })

    return NextResponse.json({
      totalArticles,
      totalStock: totalStock._sum.stock ?? 0,
      lowStockArticles,
      totalSales: salesAgg._sum.total ?? 0,
      totalOrders: salesAgg._count.id ?? 0,
      salesByDay: Array.from(dayMap.values()),
      topSelling,
      recentReceipts,
    })
  } catch (e) {
    console.error('[GET /api/stats]', e)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
