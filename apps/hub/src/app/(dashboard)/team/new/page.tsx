"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@primeair/ui";
import { ArrowLeft, UserPlus } from "lucide-react";

const jobTypeValues = ["SERVICE_TECH", "INSTALLER", "OFFICE_STAFF"] as const;
const payTypeValues = ["HOURLY", "SALARY"] as const;

const jobTypeLabel: Record<string, string> = {
  SERVICE_TECH: "Service Tech", INSTALLER: "Installer", OFFICE_STAFF: "Office Staff",
};

export default function NewTeamMemberPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: roles } = trpc.roles.list.useQuery();

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    roleId: "",
    jobType: "SERVICE_TECH" as typeof jobTypeValues[number],
    payType: "HOURLY" as typeof payTypeValues[number],
    hourlyRate: "", title: "",
  });
  const [error, setError] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: (user) => {
      utils.users.list.invalidate();
      router.push(`/team/${user.id}`);
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setError("");
    createMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.replace(/\D/g, "") || null,
      roleId: form.roleId || undefined,
      jobType: form.jobType,
      payType: form.payType,
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      title: form.title.trim() || null,
    });
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/team">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Team</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Team Member</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@example.com (optional)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5551234567 (for OTP login)"
                />
                <p className="text-xs text-gray-500">Required for timeclock app login</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Default (Technician)" /></SelectTrigger>
                  <SelectContent>
                    {(roles ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job Type</Label>
                <Select value={form.jobType} onValueChange={(v) => setForm({ ...form, jobType: v as typeof jobTypeValues[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {jobTypeValues.map((j) => (
                      <SelectItem key={j} value={j}>{jobTypeLabel[j]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select value={form.payType} onValueChange={(v) => setForm({ ...form, payType: v as typeof payTypeValues[number] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {payTypeValues.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  placeholder="25.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Lead Technician, Dispatcher"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/team" className="flex-1">
                <Button type="button" variant="outline" className="w-full">Cancel</Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                <UserPlus className="h-4 w-4 mr-1.5" />
                {createMutation.isPending ? "Creating..." : "Add Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <strong>Note:</strong> A temporary password will be auto-generated for this account.
        Field workers use phone OTP (no password needed). Office staff will use their email to log into the hub.
      </div>
    </div>
  );
}
