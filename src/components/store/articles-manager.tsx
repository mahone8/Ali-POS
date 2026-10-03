'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Search, Package, Camera } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatPKR } from '@/lib/format'
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
  cost: number
  stock: number
  createdAt: string
}

const CATEGORIES = [
  'T-Shirt', 'Shirt', 'Jeans', 'Jacket', 'Dress',
  'Hoodie', 'Trousers', 'Coat', 'Sweater', 'Accessory', 'Other'
]
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'Free']

export function ArticlesManager() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Article | null>(null)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/articles?q=${encodeURIComponent(search)}`)
      if (res.ok) setArticles(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const id = setTimeout(load, 250)
    return () => clearTimeout(id)
  }, [search])

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (a: Article) => {
    setEditing(a)
    setOpen(true)
  }

  const handleDelete = async (a: Article) => {
    const res = await fetch(`/api/articles/${a.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Article deleted', description: a.name })
      load()
    } else {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, category or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="sm:w-auto w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {articles.length} article{articles.length === 1 ? '' : 's'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No articles found. Click <strong>Add Article</strong> to create your first one.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden md:table-cell">Size</TableHead>
                    <TableHead className="hidden md:table-cell">Color</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.sku}</TableCell>
                      <TableCell className="font-medium">
                        {a.name}
                        {a.brand && (
                          <span className="block text-xs text-muted-foreground">
                            {a.brand}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{a.size}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {a.color || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPKR(a.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            a.stock === 0
                              ? 'destructive'
                              : a.stock <= 5
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {a.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete article?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{a.name}</strong> ({a.sku}).
                                  Past sales records of this article will be kept.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => startTransition(() => handleDelete(a))}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ArticleFormDialog
        open={open}
        onOpenChange={setOpen}
        article={editing}
        onSaved={() => {
          setOpen(false)
          load()
        }}
      />
    </div>
  )
}

function ArticleFormDialog({
  open,
  onOpenChange,
  article,
  onSaved,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  article: Article | null
  onSaved: () => void
}) {
  const isEdit = !!article
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  // form state
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('T-Shirt')
  const [brand, setBrand] = useState('')
  const [size, setSize] = useState('M')
  const [color, setColor] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [stock, setStock] = useState('')

  // reset when opening
  useEffect(() => {
    if (open) {
      setSku(article?.sku ?? '')
      setName(article?.name ?? '')
      setCategory(article?.category ?? 'T-Shirt')
      setBrand(article?.brand ?? '')
      setSize(article?.size ?? 'M')
      setColor(article?.color ?? '')
      setPrice(article ? String(article.price) : '')
      setCost(article ? String(article.cost) : '')
      setStock(article ? String(article.stock) : '')
    }
  }, [open, article])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        sku: sku.trim(),
        name: name.trim(),
        category,
        brand: brand.trim(),
        size,
        color: color.trim(),
        price: Number(price),
        cost: Number(cost || 0),
        stock: Number(stock || 0),
      }
      const url = isEdit ? `/api/articles/${article!.id}` : '/api/articles'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          title: isEdit ? 'Update failed' : 'Create failed',
          description: data.error ?? 'Unknown error',
          variant: 'destructive',
        })
      } else {
        toast({
          title: isEdit ? 'Article updated' : 'Article created',
          description: payload.name,
        })
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Article' : 'Add New Article'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of this clothing article.'
              : 'Register a new article in your store inventory. The SKU acts as the barcode — it is what the POS will scan at checkout.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="sku">SKU / Barcode *</Label>
              <div className="flex gap-2">
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. TS-RED-M or 8960123456789"
                  required
                  className="font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setCameraOpen(true)}
                  className="shrink-0"
                  aria-label="Scan barcode with camera"
                  title="Scan barcode with phone camera"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Type a custom SKU (e.g. <code className="font-mono">TS-RED-M</code>),
                or tap the camera icon to scan the barcode already printed on the
                product's label and use that as the SKU.
              </p>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="name">Article Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cotton Crew T-Shirt"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Z Basics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">Size *</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger id="size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Red"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Selling Price (PKR) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1200"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost Price (PKR)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step={1}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="700"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="stock">Opening Stock *</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="10"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Article'}
            </Button>
          </DialogFooter>
        </form>

        {/* Camera scanner for SKU/barcode input */}
        <CameraScanner
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onDetected={(code) => {
            setSku(code)
            toast({
              title: 'Barcode scanned',
              description: `SKU set to ${code}`,
            })
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
