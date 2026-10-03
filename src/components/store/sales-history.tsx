'use client'

import { useEffect, useState } from 'react'
import { Search, Receipt as ReceiptIcon, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatPKR, formatDateTime } from '@/lib/format'
import { Receipt } from './receipt'

interface Sale {
  id: string
  receiptNo: string
  customerName: string | null
  total: number
  paymentMethod: string
  createdAt: string
  items: { id: string; name: string; quantity: number; price: number; subtotal: number }[]
}

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales?limit=200')
      if (res.ok) setSales(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = sales.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.receiptNo.toLowerCase().includes(q) ||
      (s.customerName ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by receipt # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <ReceiptIcon className="h-4 w-4" />
              Sales History
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {filtered.length} receipt{filtered.length === 1 ? '' : 's'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No sales recorded yet. Head to the POS tab to make your first sale.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Items</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {s.receiptNo}
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.customerName ?? (
                          <span className="text-muted-foreground italic">
                            Walk-in
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {s.items?.length ?? 0}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{s.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(s.total)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(s.id)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
            <DialogDescription>View or reprint this receipt</DialogDescription>
          </DialogHeader>
          {selectedId && (
            <Receipt saleId={selectedId} onDone={() => setSelectedId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
