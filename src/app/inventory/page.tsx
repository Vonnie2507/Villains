'use client'

import { DashboardLayout } from '@/components/layouts/DashboardLayout'
import { PageHeader } from '@/components/blocks/PageHeader'
import { SearchFilter } from '@/components/blocks/SearchFilter'
import { DataTable, Column } from '@/components/blocks/DataTable'
import { StatCard, StatGrid } from '@/components/blocks/StatCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Package, AlertTriangle, TrendingDown } from 'lucide-react'

/* ── DEMO DATA — Replace with hooks ── */
const DEMO_INVENTORY = [
  { id: '1', sku: 'PVC-PNL-1800', name: 'PVC Panel 1800x2400', stock: 48, minStock: 20, location: 'Bay A1', status: 'In Stock', unitCost: '$185' },
  { id: '2', sku: 'PVC-PST-2400', name: 'PVC Post 2400mm', stock: 65, minStock: 30, location: 'Bay A2', status: 'In Stock', unitCost: '$65' },
  { id: '3', sku: 'PVC-CAP-STD', name: 'Post Cap — Standard', stock: 120, minStock: 50, location: 'Shelf B1', status: 'In Stock', unitCost: '$8' },
  { id: '4', sku: 'PVC-GATE-SGL', name: 'Gate Kit — Single', stock: 3, minStock: 5, location: 'Bay C1', status: 'Low Stock', unitCost: '$420' },
  { id: '5', sku: 'PVC-GATE-DBL', name: 'Gate Kit — Double', stock: 0, minStock: 3, location: 'Bay C2', status: 'Out of Stock', unitCost: '$780' },
  { id: '6', sku: 'CNC-20KG', name: 'Concrete 20kg Bag', stock: 85, minStock: 40, location: 'Yard D1', status: 'In Stock', unitCost: '$9' },
  { id: '7', sku: 'PVC-RAIL-TOP', name: 'Top Rail 2400mm', stock: 8, minStock: 15, location: 'Bay A3', status: 'Low Stock', unitCost: '$42' },
]

const columns: Column<typeof DEMO_INVENTORY[0]>[] = [
  { key: 'sku', header: 'SKU', sortable: true },
  { key: 'name', header: 'Product', sortable: true },
  { key: 'stock', header: 'Stock', sortable: true, render: r => (
    <span className={r.stock <= r.minStock ? 'font-bold text-status-error' : ''}>{r.stock}</span>
  )},
  { key: 'minStock', header: 'Min Stock' },
  { key: 'location', header: 'Location' },
  { key: 'status', header: 'Status', render: r => {
    const v = r.status === 'In Stock' ? 'success' : r.status === 'Low Stock' ? 'warning' : 'error'
    return <Badge variant={v as any} dot>{r.status}</Badge>
  }},
  { key: 'unitCost', header: 'Unit Cost', sortable: true },
]

export default function InventoryPage() {
  return (
    <DashboardLayout activePath="/inventory">
      <PageHeader
        title="Inventory"
        description="Track stock levels and manage products"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Inventory' }]}
        actions={<Button icon={<Plus className="w-4 h-4" />}>Add Product</Button>}
      />

      <StatGrid className="mb-6">
        <StatCard title="Total Products" value="7" icon={<Package className="w-5 h-5" />} />
        <StatCard title="Low Stock" value="2" icon={<TrendingDown className="w-5 h-5" />} />
        <StatCard title="Out of Stock" value="1" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard title="Stock Value" value="$24,680" change={-3.2} changeLabel="this month" />
      </StatGrid>

      <SearchFilter placeholder="Search products..." />

      <div className="mt-4">
        <DataTable columns={columns} data={DEMO_INVENTORY} />
      </div>
    </DashboardLayout>
  )
}
