'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Receipt,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { formatPKR, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'

interface Stats {
  totalArticles: number
  totalStock: number
  lowStockArticles: any[]
  totalSales: number
  totalOrders: number
  salesByDay: { date: string; total: number; count: number }[]
  topSelling: { name: string; sku: string; qty: number }[]
  recentReceipts: any[]
}

export function Dashboard({ onSeed }: { onSeed?: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse bg-muted/40 h-32" />
        ))}
      </div>
    )
  }

  if (!stats) {
    return <div>Failed to load stats.</div>
  }

  const hasData = stats.totalArticles > 0

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Total Articles"
          value={String(stats.totalArticles)}
          tint="text-amber-700 bg-amber-50"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          label="Stock Units"
          value={String(stats.totalStock)}
          tint="text-emerald-700 bg-emerald-50"
        />
        <StatCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label="Total Orders"
          value={String(stats.totalOrders)}
          tint="text-sky-700 bg-sky-50"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Sales"
          value={formatPKR(stats.totalSales)}
          tint="text-rose-700 bg-rose-50"
        />
      </div>

      {!hasData && (
        <Card className="border-dashed bg-amber-50/50 border-amber-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              No articles in inventory
            </CardTitle>
            <CardDescription>
              Your store is empty. Add articles one by one from the Articles
              tab, or load the demo catalog to test the POS immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={onSeed}>Load demo catalog</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales — last 7 days</CardTitle>
            <CardDescription>Daily revenue trend</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={stats.salesByDay}
                margin={{ left: -10, right: 10, top: 5, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => {
                    const date = new Date(d)
                    return `${date.getDate()}/${date.getMonth() + 1}`
                  }}
                  fontSize={12}
                  stroke="#64748b"
                />
                <YAxis
                  fontSize={12}
                  stroke="#64748b"
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatPKR(value), 'Revenue']}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString('en-PK', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#salesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top selling */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling</CardTitle>
            <CardDescription>By units sold (all time)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topSelling.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sales recorded yet.
              </p>
            )}
            {stats.topSelling.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.sku}</p>
                  </div>
                </div>
                <Badge variant="secondary">{t.qty} sold</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Items at or below 5 units</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.lowStockArticles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All articles are well stocked.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.lowStockArticles.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {a.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={a.stock === 0 ? 'destructive' : 'secondary'}
                        >
                          {a.stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent receipts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Recent Receipts
            </CardTitle>
            <CardDescription>Latest 5 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentReceipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentReceipts.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {s.receiptNo}
                      </TableCell>
                      <TableCell>{s.items?.length ?? 0}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(s.total)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tint: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          </div>
          <span
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${tint}`}
          >
            {icon}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
