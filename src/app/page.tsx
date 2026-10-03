'use client'

import { useEffect, useState } from 'react'
import { LayoutDashboard, Package, ScanLine, History, Store, LogOut, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dashboard } from '@/components/store/dashboard'
import { ArticlesManager } from '@/components/store/articles-manager'
import { PosTerminal } from '@/components/store/pos-terminal'
import { SalesHistory } from '@/components/store/sales-history'
import { LoginScreen } from '@/components/store/login-screen'
import { useAuth } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const { toast } = useToast()

  const user = useAuth((s) => s.user)
  const initialized = useAuth((s) => s.initialized)
  const refresh = useAuth((s) => s.refresh)
  const logout = useAuth((s) => s.logout)

  // On mount: check if already authenticated via cookie
  useEffect(() => {
    if (!initialized) refresh()
  }, [initialized, refresh])

  const handleSeed = async () => {
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.success) {
      toast({
        title: 'Demo catalog loaded',
        description: `${data.count} articles added.`,
      })
      setTimeout(() => window.location.reload(), 800)
    } else {
      toast({ title: 'Failed', description: data.error, variant: 'destructive' })
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({ title: 'Signed out' })
  }

  // Initial session check still running
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Not authenticated — show login
  if (!user) {
    return <LoginScreen />
  }

  // Authenticated — show the main app
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b bg-white sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-teal-600 text-white">
            <Store className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">Ali POS System</h1>
            <p className="text-xs text-muted-foreground">
              Point of Sale &amp; Inventory
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              Signed in as <strong className="text-foreground">{user}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto sm:h-10 mb-6 print:hidden">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Articles</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="pos" className="gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">New Sale</span>
              <span className="sm:hidden">Sell</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
              <span className="sm:hidden">Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <Dashboard onSeed={handleSeed} />
          </TabsContent>
          <TabsContent value="articles" className="mt-0">
            <ArticlesManager />
          </TabsContent>
          <TabsContent value="pos" className="mt-0">
            <PosTerminal />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <SalesHistory />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t bg-white py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          Ali POS System &middot; Point of Sale &amp; Inventory Management
        </div>
      </footer>
    </div>
  )
}
