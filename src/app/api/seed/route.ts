import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/seed - seed sample articles for demo (idempotent)
export async function POST() {
  try {
    const existing = await db.article.count()
    if (existing > 0) {
      return NextResponse.json({
        success: true,
        message: 'Already seeded',
        count: existing,
      })
    }

    const samples = [
      { sku: 'TS-RED-M',   name: 'Cotton Crew T-Shirt',  category: 'T-Shirt', brand: 'Basics', size: 'M',   color: 'Red',    price: 1200, cost: 700,  stock: 25 },
      { sku: 'TS-BLK-L',   name: 'Cotton Crew T-Shirt',  category: 'T-Shirt', brand: 'Basics', size: 'L',   color: 'Black',  price: 1200, cost: 700,  stock: 30 },
      { sku: 'TS-WHT-S',   name: 'Cotton Crew T-Shirt',  category: 'T-Shirt', brand: 'Basics', size: 'S',   color: 'White',  price: 1200, cost: 700,  stock: 4 },
      { sku: 'SH-BLU-M',   name: 'Oxford Button Shirt',   category: 'Shirt',   brand: 'Formal', size: 'M',  color: 'Blue',   price: 2800, cost: 1800, stock: 15 },
      { sku: 'SH-WHT-L',   name: 'Oxford Button Shirt',   category: 'Shirt',   brand: 'Formal', size: 'L',  color: 'White',  price: 2800, cost: 1800, stock: 12 },
      { sku: 'JN-SLK-32',  name: 'Slim Fit Jeans',        category: 'Jeans',   brand: 'Denim Co.',  size: '32', color: 'Black',  price: 3500, cost: 2200, stock: 10 },
      { sku: 'JN-SLK-34',  name: 'Slim Fit Jeans',        category: 'Jeans',   brand: 'Denim Co.',  size: '34', color: 'Blue',   price: 3500, cost: 2200, stock: 8 },
      { sku: 'JK-LTR-M',   name: 'Leather Biker Jacket',  category: 'Jacket',  brand: 'Leatherworks', size: 'M', color: 'Brown',  price: 8500, cost: 5500, stock: 5 },
      { sku: 'JK-BLR-L',   name: 'Leather Biker Jacket',  category: 'Jacket',  brand: 'Leatherworks', size: 'L', color: 'Black',  price: 8500, cost: 5500, stock: 3 },
      { sku: 'DR-FLR-M',   name: 'Floral Summer Dress',   category: 'Dress',   brand: 'Femme',   size: 'M', color: 'Pink',   price: 4200, cost: 2700, stock: 9 },
      { sku: 'HD-GRY-M',   name: 'Fleece Hoodie',         category: 'Hoodie',  brand: 'Streetwear',  size: 'M', color: 'Grey',   price: 2900, cost: 1700, stock: 18 },
      { sku: 'HD-BLK-L',   name: 'Fleece Hoodie',         category: 'Hoodie',  brand: 'Streetwear',  size: 'L', color: 'Black',  price: 2900, cost: 1700, stock: 6 },
    ]

    await db.article.createMany({ data: samples })

    return NextResponse.json({
      success: true,
      message: 'Seeded sample articles',
      count: samples.length,
    })
  } catch (e) {
    console.error('[POST /api/seed]', e)
    return NextResponse.json({ error: 'Failed to seed' }, { status: 500 })
  }
}
