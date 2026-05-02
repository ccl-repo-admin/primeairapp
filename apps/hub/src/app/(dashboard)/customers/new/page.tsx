"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input, Label,
} from "@primeair/ui";
import { ArrowLeft, UserPlus } from "lucide-react";

export default function NewCustomerPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", companyName: "", email: "", phone: "", altPhone: "",
    notes: "", line1: "", line2: "", city: "", state: "", zip: "",
  });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: (c) => {
      utils.customers.list.invalidate();
      router.push(`/customers/${c.id}`);
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim()) { setError("First name is required."); return; }
    setError("");
    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || null,
      companyName: form.companyName.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.replace(/\D/g, "") || null,
      altPhone: form.altPhone.replace(/\D/g, "") || null,
      notes: form.notes.trim() || null,
      line1: form.line1.trim() || null,
      line2: form.line2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip: form.zip.trim() || null,
    });
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/customers">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Customers</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name <span className="text-red-500">*</span></Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Smith Property Management (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Primary Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="5551234567" />
              </div>
              <div className="space-y-1.5">
                <Label>Alt Phone</Label>
                <Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Gate code, pet info, etc." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Primary Service Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Street Address</Label>
              <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="space-y-1.5">
              <Label>Unit / Apt</Label>
              <Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Suite 4B (optional)" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="TX" maxLength={2} />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} placeholder="78701" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/customers" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
            <UserPlus className="h-4 w-4 mr-1.5" />
            {createMutation.isPending ? "Saving..." : "Add Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
