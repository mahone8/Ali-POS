'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  Scan,
  Search,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCart, selectSubtotal, selectTax, selectTotal } from '@/stores/cart-store'
import { formatPKR, formatDateTime } from '@/lib/format'
import { Receipt } from './receipt'
import { CameraScanner } from './camera-scanner'

interface Article {
  id: string
  sku: string
  name: string
  category: string
  brand: string | null
  size: string
  color: string | null
  price: number
  stock: number
}

export function PosTerminal() {
  const [scanInput, setScanInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Article[]>([])
  const [showResults, setShowResults] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [, startTransition] = useTransition()
  const { toast } = useToast()

  const items = useCart((s) => s.items)
  const addItem = useCart((s) => s.addItem)
  const removeItem = useCart((s) => s.removeItem)
  const setQuantity = useCart((s) => s.setQuantity)
  const clear = useCart((s) => s.clear)
  const subtotal = useCart(selectSubtotal)
  const tax = useCart(selectTax)
  const total = useCart(selectTotal)
  const taxRate = useCart((s) => s.taxRate)
  const discount = useCart((s) => s.discount)
  const paymentMethod = useCart((s) => s.paymentMethod)
  const paidAmount = useCart((s) => s.paidAmount)
  const customerName = useCart((s) => s.customerName)
  const customerPhone = useCart((s) => s.customerPhone)
  const setTaxRate = useCart((s) => s.setTaxRate)
  const setDiscount = useCart((s) => s.setDiscount)
  const setPayment = useCart((s) => s.setPayment)
  const setCustomer = useCart((s) => s.setCustomer)

  const inputRef = useRef<HTMLInputElement>(null)

  // keep scan input focused for USB barcode scanner
  useEffect(() => {
    const focus = () => {
      if (!checkoutOpen && !receiptId) inputRef.current?.focus()
    }
    focus()
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [checkoutOpen, receiptId])

  // search by SKU/name as the user types (the "manual scan")
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) return
    const id = setTimeout(async () => {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json() as Article[]
        setSearchResults(data.slice(0, 8))
        setShowResults(data.length > 0)
      }
    }, 200)
    return () => clearTimeout(id)
  }, [searchQuery])

  const handleAddBySku = async (sku: string) => {
    const code = sku.trim()
    if (!code) return
    const res = await fetch(`/api/articles?q=${encodeURIComponent(code)}`)
    if (!res.ok) {
      toast({ title: 'Search failed', variant: 'destructive' })
      return
    }
    const data = await res.json()
    // exact SKU match
    const exact = data.find((a: Article) => a.sku.toLowerCase() === code.toLowerCase())
    if (exact) {
      addToCart(exact)
      setLastScanned(exact.sku)
      setTimeout(() => setLastScanned(null), 1500)
    } else if (data.length === 1) {
      addToCart(data[0])
      setLastScanned(data[0].sku)
      setTimeout(() => setLastScanned(null), 1500)
    } else if (data.length > 1) {
      setSearchResults(data.slice(0, 8))
      setShowResults(true)
      toast({
        title: 'Multiple matches',
        description: 'Please pick one from the list.',
      })
    } else {
      toast({
        title: 'Not found',
        description: `No article matches "${code}".`,
        variant: 'destructive',
      })
    }
    setScanInput('')
    setSearchQuery('')
  }

  const addToCart = (a: Article) => {
    if (a.stock <= 0) {
      toast({
        title: 'Out of stock',
        description: `${a.name} (${a.sku}) has 0 units.`,
        variant: 'destructive',
      })
      return
    }
    addItem({
      articleId: a.id,
      sku: a.sku,
      name: a.name,
      category: a.category,
      size: a.size,
      color: a.color,
      price: a.price,
      stock: a.stock,
    })
    toast({
      title: 'Added to cart',
      description: `${a.name} — ${a.size}${a.color ? ' / ' + a.color : ''}`,
    })
  }

  // scan input: a USB barcode scanner types fast and ends with Enter
  const handleScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddBySku(scanInput)
    }
  }

  const handleCheckout = async () => {
    if (items.length === 0) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({
              articleId: i.articleId,
              sku: i.sku,
              name: i.name,
              category: i.category,
              size: i.size,
              color: i.color,
              price: i.price,
              quantity: i.quantity,
            })),
            customerName,
            customerPhone,
            taxRate,
            discount,
            paymentMethod,
            paidAmount,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast({
            title: 'Checkout failed',
            description: data.error ?? 'Unknown error',
            variant: 'destructive',
          })
          return
        }
        toast({
          title: 'Sale completed',
          description: `Receipt ${data.receiptNo}`,
        })
        setReceiptId(data.id)
        setCheckoutOpen(false)
        clear()
      } catch (err) {
        toast({
          title: 'Checkout failed',
          description: 'Network error',
          variant: 'destructive',
        })
      }
    })
  }

  const change = Math.max(0, paidAmount - total)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* left: scan + search */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Scan / Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Scan
                  className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                    lastScanned ? 'text-emerald-600' : 'text-muted-foreground'
                  }`}
                />
                <Input
                  ref={inputRef}
                  placeholder="Scan barcode or type SKU / name then press Enter"
                  value={scanInput}
                  onChange={(e) => {
                    setScanInput(e.target.value)
                    setSearchQuery(e.target.value)
                  }}
                  onKeyDown={handleScanKey}
                  className="pl-10 h-12 text-base font-mono"
                  autoFocus
                />
                {lastScanned && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setCameraOpen(true)}
                className="h-12 w-12 shrink-0"
                aria-label="Open camera scanner"
                title="Scan with phone camera"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              USB barcode scanners act like a keyboard — keep this field
              focused and pull the trigger. The scanner auto-presses Enter.
              Or tap the <strong>camera icon</strong> to scan with your phone.
            </p>
          </CardContent>
        </Card>

        {/* search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Matches — click to add
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      addToCart(a)
                      setShowResults(false)
                      setScanInput('')
                      setSearchQuery('')
                      inputRef.current?.focus()
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-b last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{a.sku}</span>
                        {' · '}
                        {a.category} · Size {a.size}
                        {a.color ? ` · ${a.color}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={a.stock === 0 ? 'destructive' : 'outline'}>
                        {a.stock} left
                      </Badge>
                      <span className="font-semibold text-sm">
                        {formatPKR(a.price)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* cart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart
                <Badge variant="secondary">
                  {items.reduce((s, i) => s + i.quantity, 0)} items
                </Badge>
              </span>
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clear()}
                  className="text-destructive hover:text-destructive"
                >
                  Clear
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Cart is empty. Scan or search to add articles.
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.articleId}>
                        <TableCell>
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="font-mono">{i.sku}</span>
                            {' · '}
                            {i.size}
                            {i.color ? ` · ${i.color}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPKR(i.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => setQuantity(i.articleId, i.quantity - 1)}
                              disabled={i.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={i.stock}
                              value={i.quantity}
                              onChange={(e) =>
                                setQuantity(i.articleId, Number(e.target.value))
                              }
                              className="h-7 w-12 text-center px-1"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => setQuantity(i.articleId, i.quantity + 1)}
                              disabled={i.quantity >= i.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPKR(i.price * i.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(i.articleId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </div>

      {/* right: summary + checkout */}
      <div className="lg:col-span-2">
        <Card className="lg:sticky lg:top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cname" className="text-xs">
                  Customer name
                </Label>
                <Input
                  id="cname"
                  value={customerName}
                  onChange={(e) =>
                    setCustomer(e.target.value, customerPhone)
                  }
                  placeholder="Walk-in customer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cphone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="cphone"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomer(customerName, e.target.value)
                  }
                  placeholder="0300-1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tax" className="text-xs">
                  Tax rate (%)
                </Label>
                <Input
                  id="tax"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={taxRate * 100}
                  onChange={(e) => setTaxRate(Number(e.target.value) / 100)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disc" className="text-xs">
                  Discount (PKR)
                </Label>
                <Input
                  id="disc"
                  type="number"
                  min={0}
                  step={1}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <Row label="Subtotal" value={formatPKR(subtotal)} />
              <Row label={`Tax (${(taxRate * 100).toFixed(1)}%)`} value={formatPKR(tax)} />
              {discount > 0 && (
                <Row
                  label="Discount"
                  value={`- ${formatPKR(discount)}`}
                  className="text-rose-600"
                />
              )}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-teal-700">
                  {formatPKR(total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="pm" className="text-xs">
                  Payment method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPayment(v as any, paidAmount)}
                >
                  <SelectTrigger id="pm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Wallet">Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paid" className="text-xs">
                  Paid amount
                </Label>
                <Input
                  id="paid"
                  type="number"
                  min={0}
                  step={1}
                  value={paidAmount}
                  onChange={(e) =>
                    setPayment(paymentMethod, Number(e.target.value))
                  }
                  placeholder={String(total)}
                />
              </div>
            </div>

            {paidAmount > 0 && (
              <div className="flex items-center justify-between text-sm bg-emerald-50 rounded-md px-3 py-2">
                <span className="text-emerald-800">Change to return</span>
                <span className="font-semibold text-emerald-800">
                  {formatPKR(change)}
                </span>
              </div>
            )}

            <Button
              className="w-full h-11 text-base"
              size="lg"
              disabled={items.length === 0}
              onClick={() => setCheckoutOpen(true)}
            >
              <ReceiptIcon className="h-4 w-4 mr-2" />
              Complete Sale & Print Receipt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* checkout confirm */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm sale</DialogTitle>
            <DialogDescription>
              This will record the sale and decrement stock. You can print the receipt next.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Row
              label="Items"
              value={String(items.reduce((s, i) => s + i.quantity, 0))}
            />
            <Row label="Subtotal" value={formatPKR(subtotal)} />
            {discount > 0 && (
              <Row label="Discount" value={`- ${formatPKR(discount)}`} />
            )}
            <Row label="Tax" value={formatPKR(tax)} />
            <div className="flex items-center justify-between pt-2 border-t font-semibold">
              <span>Total</span>
              <span className="text-teal-700">{formatPKR(total)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex items-center justify-between text-sm bg-emerald-50 rounded px-3 py-2">
                <span>Change</span>
                <span>{formatPKR(change)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout}>Confirm & Generate Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* receipt preview */}
      <Dialog open={!!receiptId} onOpenChange={(o) => !o && setReceiptId(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale complete</DialogTitle>
            <DialogDescription>
              {formatDateTime(new Date())}
            </DialogDescription>
          </DialogHeader>
          {receiptId && <Receipt saleId={receiptId} onDone={() => setReceiptId(null)} />}
        </DialogContent>
      </Dialog>

      {/* camera scanner */}
      <CameraScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={(code) => {
          handleAddBySku(code)
          // re-focus the scan field so USB scanner stays ready
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
      />
    </div>
  )
}

function Row({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${className}`}>{value}</span>
    </div>
  )
}
