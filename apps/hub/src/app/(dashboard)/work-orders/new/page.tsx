"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@primeair/ui";
import { ArrowLeft, Search, ClipboardList } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  NEW_INSTALLATION: "New Installation",
  REPAIR: "Repair",
  PREVENTIVE_MAINTENANCE: "Preventive Maintenance",
  EMERGENCY: "Emergency",
  WARRANTY: "Warranty",
  INSPECTION: "Inspection",
  ESTIMATE_ONLY: "Estimate Only",
};

const PRIORITY_LABELS: Record<string, string> = {
  EMERGENCY: "Emergency",
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

const PRIORITY_COLORS: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
  EMERGENCY: "destructive",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "default",
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "REPAIR" as const,
    priority: "NORMAL" as const,
    description: "",
    internalNotes: "",
    scheduledStart: "",
    estimatedDuration: "",
  });

  function handleSearchChange(val: string) {
    setCustomerSearch(val);
    clearTimeout((window as unknown as { _woSearchTimer?: ReturnType<typeof setTimeout> })._woSearchTimer);
    (window as unknown as { _woSearchTimer?: ReturnType<typeof setTimeout> })._woSearchTimer = setTimeout(
      () => setDebouncedSearch(val), 300
    );
  }

  const { data: customers } = trpc.customers.list.useQuery(
    { search: debouncedSearch || undefined, limit: 8 },
    { enabled: debouncedSearch.length >= 2 }
  );

  const { data: selectedCustomer } = trpc.customers.getById.useQuery(
    { id: selectedCustomerId! },
    { enabled: !!selectedCustomerId }
  );

  const createMutation = trpc.workOrders.create.useMutation({
    onSuccess: (wo) => {
      utils.workOrders.list.invalidate();
      router.push(`/work-orders/${wo.id}`);
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) { setError("Select a customer first."); return; }
    setError("");
    createMutation.mutate({
      customerId: selectedCustomerId,
      serviceAddressId: selectedAddressId ?? undefined,
      type: form.type,
      priority: form.priority,
      description: form.description.trim() || null,
      internalNotes: form.internalNotes.trim() || null,
      scheduledStart: form.scheduledStart ? new Date(form.scheduledStart) : null,
      estimatedDuration: form.estimatedDuration ? Number(form.estimatedDuration) : null,
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/work-orders">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Work Orders</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Work Order</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}

        {/* Customer selection */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!selectedCustomerId ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by name, phone, or email..."
                    className="pl-9"
                  />
                </div>
                {customers && customers.length > 0 && (
                  <div className="border rounded-md divide-y">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerSearch("");
                          setDebouncedSearch("");
                        }}
                      >
                        <p className="font-medium text-sm">{c.firstName} {c.lastName ?? ""}</p>
                        {c.companyName && <p className="text-xs text-gray-500">{c.companyName}</p>}
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {debouncedSearch.length >= 2 && customers?.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    No customers found.{" "}
                    <Link href="/customers/new" className="text-primary underline">Add new customer</Link>
                  </div>
                )}
                {debouncedSearch.length < 2 && (
                  <p className="text-xs text-gray-400">Type at least 2 characters to search</p>
                )}
              </>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName ?? ""}</p>
                  {selectedCustomer?.companyName && (
                    <p className="text-sm text-gray-500">{selectedCustomer.companyName}</p>
                  )}
                  {selectedCustomer?.phone && (
                    <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSelectedCustomerId(null); setSelectedAddressId(null); }}
                >
                  Change
                </Button>
              </div>
            )}

            {/* Address picker — shown once customer is selected */}
            {selectedCustomer && selectedCustomer.addresses.length > 0 && (
              <div className="space-y-1.5">
                <Label>Service Address</Label>
                <Select
                  value={selectedAddressId ?? "none"}
                  onValueChange={(v) => setSelectedAddressId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select address" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific address</SelectItem>
                    {selectedCustomer.addresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.line1}{addr.city ? `, ${addr.city}` : ""}{addr.state ? `, ${addr.state}` : ""}
                        {addr.isPrimary && " (Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job details */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as typeof form.priority })}>
                  <SelectTrigger>
                    <SelectValue>
                      <Badge variant={PRIORITY_COLORS[form.priority]}>{PRIORITY_LABELS[form.priority]}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        <Badge variant={PRIORITY_COLORS[v]}>{l}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scheduled Start</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledStart}
                  onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated Duration (min)</Label>
                <Input
                  type="number"
                  min={0}
                  step={15}
                  value={form.estimatedDuration}
                  onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
                  placeholder="60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue or work requested..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                rows={2}
                value={form.internalNotes}
                onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                placeholder="Gate codes, internal reminders (not visible to customer)..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/work-orders" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button
            type="submit"
            className="flex-1"
            disabled={!selectedCustomerId || createMutation.isPending}
          >
            <ClipboardList className="h-4 w-4 mr-1.5" />
            {createMutation.isPending ? "Creating..." : "Create Work Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
