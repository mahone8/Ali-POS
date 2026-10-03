'use client'

import { useEffect, useState } from 'react'
import { Printer, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatPKR, formatDateTime } from '@/lib/format'

interface SaleItem {
  id: string
  sku: string
  name: string
  size: string
  color: string | null
  price: number
  quantity: number
  subtotal: number
}

interface Sale {
  id: string
  receiptNo: string
  customerName: string | null
  customerPhone: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  paymentMethod: string
  paidAmount: number
  changeAmount: number
  createdAt: string
  items: SaleItem[]
}

export function Receipt({
  saleId,
  onDone,
}: {
  saleId: string
  onDone?: () => void
}) {
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await fetch(`/api/sales/${saleId}`)
      if (!alive) return
      if (res.ok) setSale(await res.json())
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [saleId])

  const handlePrint = () => {
    if (!sale) return
    // Open a fresh print window containing only the receipt markup.
    // This avoids issues with the parent Dialog (max-h, overflow, overlay)
    // that previously clipped the receipt during print.
    const printWindow = window.open('', '_blank', 'width=420,height=720')
    if (!printWindow) {
      // popup blocked — fallback to page print
      window.print()
      return
    }
    const html = buildReceiptHTML(sale)
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    // give the new doc a moment to layout before invoking print
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      // close after print dialog closes (most browsers)
      setTimeout(() => printWindow.close(), 300)
    }, 300)
  }

  if (loading) {
    return <div className="py-6 text-center text-sm">Loading receipt...</div>
  }
  if (!sale) {
    return <div className="py-6 text-center text-sm">Receipt not found.</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
        <CheckCircle2 className="h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">Receipt generated</p>
          <p className="text-xs">
            Receipt <span className="font-mono">{sale.receiptNo}</span>
          </p>
        </div>
      </div>

      {/* Receipt body — print-friendly */}
      <div
        id="printable-receipt"
        className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm font-mono text-slate-900"
      >
        <div className="text-center">
          <p className="text-base font-bold tracking-wide">ALI POS SYSTEM</p>
          <p className="text-xs text-slate-500">Main Branch · Karachi</p>
          <p className="text-xs text-slate-500">Tel: 021-1234567</p>
        </div>
        <Divider />
        <div className="flex items-center justify-between text-xs">
          <span>Receipt:</span>
          <span className="font-semibold">{sale.receiptNo}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span>Date:</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        {sale.customerName && (
          <div className="flex items-center justify-between text-xs">
            <span>Customer:</span>
            <span>{sale.customerName}</span>
          </div>
        )}
        {sale.customerPhone && (
          <div className="flex items-center justify-between text-xs">
            <span>Phone:</span>
            <span>{sale.customerPhone}</span>
          </div>
        )}
        <Divider />
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dashed border-slate-300">
              <th className="text-left py-1">Item</th>
              <th className="text-center py-1">Qty</th>
              <th className="text-right py-1">Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id} className="align-top">
                <td className="py-1">
                  <div>{it.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {it.sku}
                    {it.size ? ` · ${it.size}` : ''}
                    {it.color ? ` · ${it.color}` : ''}
                  </div>
                </td>
                <td className="text-center py-1">{it.quantity}</td>
                <td className="text-right py-1">{formatPKR(it.price)}</td>
                <td className="text-right py-1">
                  {formatPKR(it.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Divider />
        <Line label="Subtotal" value={formatPKR(sale.subtotal)} />
        {sale.taxAmount > 0 && (
          <Line
            label={`Tax (${(sale.taxRate * 100).toFixed(1)}%)`}
            value={formatPKR(sale.taxAmount)}
          />
        )}
        {sale.discount > 0 && (
          <Line label="Discount" value={`- ${formatPKR(sale.discount)}`} />
        )}
        <div className="flex items-center justify-between font-bold text-sm pt-1">
          <span>TOTAL</span>
          <span>{formatPKR(sale.total)}</span>
        </div>
        <Divider />
        <Line label="Payment" value={sale.paymentMethod} />
        <Line label="Paid" value={formatPKR(sale.paidAmount)} />
        {sale.changeAmount > 0 && (
          <Line label="Change" value={formatPKR(sale.changeAmount)} />
        )}
        <Divider />
        <p className="text-center text-xs text-slate-500 pt-1">
          Thank you for shopping with us!
        </p>
        <p className="text-center text-[10px] text-slate-400">
          This is a computer-generated receipt.
        </p>
      </div>

      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        {onDone && (
          <Button variant="outline" onClick={onDone} className="flex-1">
            New Sale
          </Button>
        )}
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="border-t border-dashed border-slate-300 my-2 print:my-1" />
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

/**
 * Build a complete standalone HTML document containing the receipt,
 * ready to be written into a print popup window. Includes its own CSS
 * so the receipt prints correctly on 58mm/80mm thermal receipt printers
 * or on standard A4 paper without any dialog/overflow interference.
 */
function buildReceiptHTML(sale: Sale): string {
  const items = sale.items
    .map(
      (it) => `
      <tr>
        <td class="name">
          <div class="line1">${escapeHTML(it.name)}</div>
          <div class="sub">${escapeHTML(it.sku)}${it.size ? ` &middot; ${escapeHTML(it.size)}` : ''}${it.color ? ` &middot; ${escapeHTML(it.color)}` : ''}</div>
        </td>
        <td class="qty">${it.quantity}</td>
        <td class="price">${formatPKR(it.price)}</td>
        <td class="total">${formatPKR(it.subtotal)}</td>
      </tr>`
    )
    .join('')

  const taxLine =
    sale.taxAmount > 0
      ? `<div class="row"><span>Tax (${(sale.taxRate * 100).toFixed(1)}%)</span><span>${formatPKR(sale.taxAmount)}</span></div>`
      : ''
  const discLine =
    sale.discount > 0
      ? `<div class="row"><span>Discount</span><span>- ${formatPKR(sale.discount)}</span></div>`
      : ''
  const customerLine = sale.customerName
    ? `<div class="row"><span>Customer:</span><span>${escapeHTML(sale.customerName)}</span></div>`
    : ''
  const phoneLine = sale.customerPhone
    ? `<div class="row"><span>Phone:</span><span>${escapeHTML(sale.customerPhone)}</span></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Ali POS System — Receipt ${escapeHTML(sale.receiptNo)}</title>
<style>
  /* ---- Page setup: 80mm thermal receipt, infinite height ---- */
  @page {
    size: 80mm auto;
    margin: 0;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
  }
  body {
    font-family: 'Courier New', 'Liberation Mono', monospace;
    font-size: 11px;
    line-height: 1.45;
    width: 72mm;          /* leaves ~4mm padding each side on 80mm paper */
    padding: 4mm;
  }
  /* ---- Receipt chrome ---- */
  .store {
    text-align: center;
    margin-bottom: 4px;
  }
  .store .name {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }
  .store .meta {
    font-size: 10px;
    color: #444;
    margin-top: 2px;
  }
  .dashed {
    border-top: 1px dashed #999;
    margin: 6px 0;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    padding: 1px 0;
  }
  .row.between {
    font-weight: bold;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  thead th {
    text-align: left;
    border-bottom: 1px dashed #999;
    padding: 3px 0;
    font-weight: bold;
  }
  thead th.qty, thead th.price, thead th.total { text-align: right; }
  thead th.qty { text-align: center; }
  tbody td {
    padding: 2px 0;
    vertical-align: top;
  }
  tbody td.qty { text-align: center; }
  tbody td.price, tbody td.total { text-align: right; }
  tbody td.name .sub {
    font-size: 9px;
    color: #555;
    margin-top: 1px;
  }
  .totals { margin-top: 4px; }
  .grand {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: bold;
    padding: 4px 0;
    border-top: 1px dashed #999;
    border-bottom: 1px dashed #999;
    margin: 4px 0;
  }
  .payment-box {
    background: #e6f4ea;
    border: 1px dashed #9bbfa9;
    padding: 4px 6px;
    border-radius: 3px;
    margin: 4px 0;
  }
  .payment-box .row { font-size: 11px; }
  .footer {
    text-align: center;
    font-size: 10px;
    color: #444;
    margin-top: 6px;
  }
  .footer .thank { font-weight: bold; }
  .footer .small { font-size: 9px; color: #666; margin-top: 2px; }
  @media screen {
    body {
      width: 360px;
      margin: 20px auto;
      border: 1px dashed #ccc;
      padding: 12px;
    }
  }
</style>
</head>
<body>
  <div class="store">
    <div class="name">ALI POS SYSTEM</div>
    <div class="meta">Main Branch &middot; Karachi</div>
    <div class="meta">Tel: 021-1234567</div>
  </div>

  <div class="dashed"></div>
  <div class="row"><span>Receipt:</span><span>${escapeHTML(sale.receiptNo)}</span></div>
  <div class="row"><span>Date:</span><span>${escapeHTML(formatDateTime(sale.createdAt))}</span></div>
  ${customerLine}
  ${phoneLine}

  <div class="dashed"></div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="qty">Qty</th>
        <th class="price">Price</th>
        <th class="total">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items}
    </tbody>
  </table>

  <div class="dashed"></div>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${formatPKR(sale.subtotal)}</span></div>
    ${taxLine}
    ${discLine}
    <div class="grand">
      <span>TOTAL</span>
      <span>${formatPKR(sale.total)}</span>
    </div>
  </div>

  <div class="payment-box">
    <div class="row"><span>Payment</span><span>${escapeHTML(sale.paymentMethod)}</span></div>
    <div class="row"><span>Paid</span><span>${formatPKR(sale.paidAmount)}</span></div>
    ${
      sale.changeAmount > 0
        ? `<div class="row" style="font-weight:bold"><span>Change</span><span>${formatPKR(sale.changeAmount)}</span></div>`
        : ''
    }
  </div>

  <div class="footer">
    <div class="thank">Thank you for shopping with us!</div>
    <div class="small">This is a computer-generated receipt.</div>
  </div>
</body>
</html>`
}

function escapeHTML(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
