'use client'

import { create } from 'zustand'

export interface CartItem {
  articleId: string
  sku: string
  name: string
  category: string
  size: string
  color?: string | null
  price: number
  stock: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  customerName: string
  customerPhone: string
  taxRate: number // fraction
  discount: number // absolute amount
  paymentMethod: 'Cash' | 'Card' | 'Wallet'
  paidAmount: number
  // actions
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (articleId: string) => void
  setQuantity: (articleId: string, qty: number) => void
  clear: () => void
  setCustomer: (name: string, phone: string) => void
  setTaxRate: (r: number) => void
  setDiscount: (d: number) => void
  setPayment: (method: 'Cash' | 'Card' | 'Wallet', paid: number) => void
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  taxRate: 0,
  discount: 0,
  paymentMethod: 'Cash',
  paidAmount: 0,

  addItem: (item, qty = 1) => {
    const items = [...get().items]
    const idx = items.findIndex((i) => i.articleId === item.articleId)
    if (idx >= 0) {
      const newQty = Math.min(items[idx].quantity + qty, item.stock || 9999)
      items[idx] = { ...items[idx], quantity: newQty }
    } else {
      items.push({ ...item, quantity: Math.min(qty, item.stock || 9999) })
    }
    set({ items })
  },

  removeItem: (articleId) =>
    set({ items: get().items.filter((i) => i.articleId !== articleId) }),

  setQuantity: (articleId, qty) =>
    set({
      items: get().items.map((i) =>
        i.articleId === articleId
          ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock || 9999)) }
          : i
      ),
    }),

  clear: () =>
    set({
      items: [],
      customerName: '',
      customerPhone: '',
      taxRate: 0,
      discount: 0,
      paymentMethod: 'Cash',
      paidAmount: 0,
    }),

  setCustomer: (name, phone) =>
    set({ customerName: name, customerPhone: phone }),

  setTaxRate: (r) => set({ taxRate: r }),
  setDiscount: (d) => set({ discount: d }),
  setPayment: (method, paid) => set({ paymentMethod: method, paidAmount: paid }),
}))

// selector helpers
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

export const selectTax = (s: CartState) =>
  +(selectSubtotal(s) * s.taxRate).toFixed(2)

export const selectTotal = (s: CartState) =>
  +(selectSubtotal(s) + selectTax(s) - s.discount).toFixed(2)
