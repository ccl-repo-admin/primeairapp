"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  Input, Label, Textarea,
} from "@primeair/ui";
import { ArrowLeft } from "lucide-react";

export default function NewPOPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    number: "",
    description: "",
    dueAt: "",
    amount: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const create = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => router.push("/purchase-orders"),
    onError: (e) => setError(e.message),
  });

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.number.trim()) { setError("PO number is required"); return; }
    create.mutate({
      number: form.number.trim(),
      description: form.description || null,
      dueAt: form.dueAt || null,
      amount: form.amount ? Number(form.amount) : null,
      notes: form.notes || null,
    });
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manually create a single PO</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PO Details</CardTitle>
          <CardDescription>PO number must be unique within your company.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="number">PO Number <span className="text-red-500">*</span></Label>
                <Input
                  id="number"
                  placeholder="e.g. PO-2024-001"
                  value={form.number}
                  onChange={(e) => set("number", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g. HVAC installation – Building A"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueAt">Due Date</Label>
              <Input
                id="dueAt"
                type="date"
                value={form.dueAt}
                onChange={(e) => set("dueAt", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Any additional details..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create PO"}
              </Button>
              <Link href="/purchase-orders">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
