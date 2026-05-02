"use client";
import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@primeair/ui";
import { Upload, ShoppingCart, CheckCircle2, Clock, XCircle, PlayCircle, Plus } from "lucide-react";

const STATUS_CONFIG = {
  OPEN:        { label: "Open",        color: "bg-blue-100 text-blue-700",   icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: PlayCircle },
  COMPLETE:    { label: "Complete",    color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  CANCELLED:   { label: "Cancelled",  color: "bg-gray-100 text-gray-500",    icon: XCircle },
} as const;

type POStatus = keyof typeof STATUS_CONFIG;

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<POStatus | "ALL">("ALL");

  const { data: pos, isLoading, refetch } = trpc.purchaseOrders.list.useQuery(
    statusFilter !== "ALL" ? { status: statusFilter } : {}
  );

  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => void refetch(),
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pos?.length ?? 0} total · {pos?.filter(p => p.status === "OPEN").length ?? 0} open
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/purchase-orders/new">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New PO
            </Button>
          </Link>
          <Link href="/purchase-orders/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-1.5" />
              Import CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as POStatus | "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!pos || pos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No purchase orders yet</p>
          <p className="text-sm text-gray-400 mt-1">Import a CSV to get started</p>
          <Link href="/purchase-orders/import" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1.5" />
              Import POs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>PO Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((po) => {
                const cfg = STATUS_CONFIG[po.status as POStatus] ?? STATUS_CONFIG.OPEN;
                const customerName = po.customer?.companyName
                  ?? (po.customer ? `${po.customer.firstName} ${po.customer.lastName ?? ""}`.trim() : "—");
                return (
                  <TableRow key={po.id} className="hover:bg-gray-50">
                    <TableCell className="font-semibold text-primary">{po.number}</TableCell>
                    <TableCell className="max-w-xs truncate text-gray-700">{po.description ?? "—"}</TableCell>
                    <TableCell className="text-gray-600">{customerName}</TableCell>
                    <TableCell className="text-gray-600 whitespace-nowrap">
                      {po.dueAt ? new Date(po.dueAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {po.amount != null ? `$${Number(po.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{po._count.timeEntries}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={po.status}
                        onValueChange={(v) => updateStatus.mutate({ id: po.id, status: v as POStatus })}
                      >
                        <SelectTrigger className={`h-7 text-xs w-36 border-0 ${cfg.color}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([val, c]) => (
                            <SelectItem key={val} value={val}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
