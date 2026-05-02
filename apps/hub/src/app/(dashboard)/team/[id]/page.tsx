"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { ArrowLeft, Save, UserX, LogOut } from "lucide-react";

const jobTypeValues = ["SERVICE_TECH", "INSTALLER", "OFFICE_STAFF"] as const;
const payTypeValues = ["HOURLY", "SALARY"] as const;

const jobTypeLabel: Record<string, string> = {
  SERVICE_TECH: "Service Tech", INSTALLER: "Installer", OFFICE_STAFF: "Office Staff",
};
const statusLabel: Record<string, string> = {
  ACTIVE: "Active", PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected",
};
const statusColors: Record<string, "success" | "warning" | "info" | "default"> = {
  ACTIVE: "success", PENDING: "warning", APPROVED: "info", REJECTED: "default",
};

function fmtDuration(minutes: number | null) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function TeamMemberPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: user, isLoading } = trpc.users.getById.useQuery({ id });
  const { data: roles } = trpc.roles.list.useQuery();
  const { data: clockedIn, refetch: refetchClockedIn } = trpc.reports.clockedInNow.useQuery();

  const activeEntry = clockedIn?.find((e) => e.user.id === id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{
    firstName: string; lastName: string; email: string; phone: string;
    roleId: string; jobType: string; payType: string; hourlyRate: string; title: string;
    maxDailyMinutes: string; maxWeeklyMinutes: string;
  } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      utils.users.getById.invalidate({ id });
      utils.users.list.invalidate();
      setEditing(false);
      setSaveError("");
    },
    onError: (e) => setSaveError(e.message),
  });

  const deactivateMutation = trpc.users.deactivate.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      router.push("/team");
    },
    onError: (e) => setSaveError(e.message),
  });

  const adminClockOut = trpc.timeclock.adminClockOut.useMutation({
    onSuccess: () => {
      refetchClockedIn();
      utils.reports.clockedInNow.invalidate();
    },
  });

  function startEdit() {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email ?? "",
      phone: user.phone ?? "",
      roleId: user.role.id,
      jobType: user.jobType,
      payType: user.payType,
      hourlyRate: user.hourlyRate ? String(Number(user.hourlyRate)) : "",
      title: user.title ?? "",
      maxDailyMinutes: user.maxDailyMinutes ? String(Math.round(user.maxDailyMinutes / 60 * 10) / 10) : "",
      maxWeeklyMinutes: user.maxWeeklyMinutes ? String(Math.round(user.maxWeeklyMinutes / 60 * 10) / 10) : "",
    });
    setEditing(true);
    setSaveError("");
  }

  function handleSave() {
    if (!form) return;
    updateMutation.mutate({
      id,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || null,
      phone: form.phone.replace(/\D/g, "") || null,
      roleId: form.roleId || undefined,
      jobType: form.jobType as typeof jobTypeValues[number],
      payType: form.payType as typeof payTypeValues[number],
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
      title: form.title || null,
      maxDailyMinutes: form.maxDailyMinutes ? Math.round(Number(form.maxDailyMinutes) * 60) : null,
      maxWeeklyMinutes: form.maxWeeklyMinutes ? Math.round(Number(form.maxWeeklyMinutes) * 60) : null,
    });
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Team member not found.</p>
        <Link href="/team"><Button variant="outline">Back to Team</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/team">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Team</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {user.firstName} {user.lastName}
        </h1>
        <Badge variant={user.isActive ? "success" : "default"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Profile</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {saveError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{saveError}</div>
            )}

            {!editing ? (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">First Name</dt>
                  <dd className="font-medium">{user.firstName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Name</dt>
                  <dd className="font-medium">{user.lastName}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd className="font-medium">{user.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium">{user.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Role</dt>
                  <dd className="font-medium">{user.role.name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Job Type</dt>
                  <dd className="font-medium">{jobTypeLabel[user.jobType]}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Pay Type</dt>
                  <dd className="font-medium">{user.payType}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Hourly Rate</dt>
                  <dd className="font-medium">
                    {user.hourlyRate ? `$${Number(user.hourlyRate).toFixed(2)}/hr` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Title</dt>
                  <dd className="font-medium">{user.title ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Daily Hour Limit</dt>
                  <dd className="font-medium">
                    {user.maxDailyMinutes
                      ? `${Math.round(user.maxDailyMinutes / 60 * 10) / 10}h / day`
                      : <span className="text-gray-400">No limit</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Weekly Hour Limit</dt>
                  <dd className="font-medium">
                    {user.maxWeeklyMinutes
                      ? `${Math.round(user.maxWeeklyMinutes / 60 * 10) / 10}h / week`
                      : <span className="text-gray-400">No limit</span>}
                  </dd>
                </div>
              </dl>
            ) : form && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(roles ?? []).map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Job Type</Label>
                  <Select value={form.jobType} onValueChange={(v) => setForm({ ...form, jobType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {jobTypeValues.map((j) => (
                        <SelectItem key={j} value={j}>{jobTypeLabel[j]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Pay Type</Label>
                  <Select value={form.payType} onValueChange={(v) => setForm({ ...form, payType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {payTypeValues.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Hourly Rate ($)</Label>
                  <Input type="number" min="0" step="0.01" value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="Optional" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lead Technician" />
                </div>
                <div className="col-span-2 border-t pt-3 mt-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Hour Limits</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Daily Limit (hours)</Label>
                      <Input
                        type="number" min="0" max="24" step="0.5"
                        value={form.maxDailyMinutes}
                        onChange={(e) => setForm({ ...form, maxDailyMinutes: e.target.value })}
                        placeholder="e.g. 8 (blank = no limit)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Weekly Limit (hours)</Label>
                      <Input
                        type="number" min="0" max="168" step="0.5"
                        value={form.maxWeeklyMinutes}
                        onChange={(e) => setForm({ ...form, maxWeeklyMinutes: e.target.value })}
                        placeholder="e.g. 40 (blank = no limit)"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">When a limit is reached, the employee cannot clock in without admin approval.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions card */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-500">
              Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>

            {activeEntry && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-2">
                <p className="text-xs font-medium text-green-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse" />
                  Currently clocked in
                </p>
                <p className="text-xs text-green-600">
                  Since {new Date(activeEntry.clockInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                  disabled={adminClockOut.isPending}
                  onClick={() => {
                    if (confirm(`Clock out ${user.firstName} ${user.lastName} now?`)) {
                      adminClockOut.mutate({ timeEntryId: activeEntry.id, reason: "Manual clock-out by admin" });
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {adminClockOut.isPending ? "Clocking out..." : "Clock Out Now"}
                </Button>
              </div>
            )}

            {user.isActive && (
              <>
                {!deactivateConfirm ? (
                  <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setDeactivateConfirm(true)}>
                    <UserX className="h-4 w-4 mr-1.5" />
                    Deactivate
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-600">This will prevent the user from logging in.</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" onClick={() => setDeactivateConfirm(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        disabled={deactivateMutation.isPending}
                        onClick={() => deactivateMutation.mutate({ id })}>
                        {deactivateMutation.isPending ? "..." : "Confirm"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timecard history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Timecards</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {user.timeEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No time entries yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{fmtDate(entry.clockInAt)}</TableCell>
                    <TableCell className="text-sm">
                      {entry.clockOutAt ? fmtDate(entry.clockOutAt) : <span className="text-green-600 font-medium">Active</span>}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDuration(entry.totalMinutes)}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[entry.status] ?? "default"}>
                        {statusLabel[entry.status] ?? entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
