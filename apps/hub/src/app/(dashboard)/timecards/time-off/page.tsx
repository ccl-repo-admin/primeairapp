"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { CheckCircle, XCircle, CalendarOff } from "lucide-react";

const STATUS_COLORS: Record<string, "warning" | "success" | "default"> = {
  PENDING: "warning", APPROVED: "success", REJECTED: "default",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start: Date, end: Date) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function TimeOffPage() {
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("ALL");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.timeoff.listRequests.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 100,
  });

  const reviewMutation = trpc.timeoff.review.useMutation({
    onSuccess: () => {
      utils.timeoff.listRequests.invalidate();
      setRejectId(null);
      setRejectNote("");
    },
  });

  function approve(requestId: string) {
    reviewMutation.mutate({ requestId, status: "APPROVED" });
  }

  function reject(requestId: string) {
    reviewMutation.mutate({ requestId, status: "REJECTED", reviewNote: rejectNote || null });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Time Off Requests</h1>
          <p className="text-sm text-gray-500 mt-1">{requests?.length ?? 0} requests</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : requests?.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarOff className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No time-off requests</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Hours/Day</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((req) => (
                  <>
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: req.user.color ?? "#1B3A6B" }}
                          >
                            {req.user.firstName[0]}{req.user.lastName[0]}
                          </div>
                          <span className="font-medium text-sm">{req.user.firstName} {req.user.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{req.policy.name}</TableCell>
                      <TableCell className="text-sm">
                        {fmtDate(req.startDate)} – {fmtDate(req.endDate)}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {daysBetween(req.startDate, req.endDate)}
                      </TableCell>
                      <TableCell className="text-sm text-center">{req.hoursPerDay}h</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                        {req.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[req.status] ?? "default"}>{req.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {req.status === "PENDING" && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                              disabled={reviewMutation.isPending}
                              onClick={() => approve(req.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setRejectId(rejectId === req.id ? null : req.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {req.status !== "PENDING" && req.reviewNote && (
                          <span className="text-xs text-gray-500 italic">{req.reviewNote}</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {rejectId === req.id && (
                      <TableRow key={`reject-${req.id}`}>
                        <TableCell colSpan={8} className="bg-red-50 px-4 py-3">
                          <div className="flex gap-3 items-end max-w-md">
                            <div className="flex-1 space-y-1">
                              <p className="text-xs text-red-700 font-medium">Rejection reason (optional)</p>
                              <input
                                className="w-full border border-red-200 rounded px-2 py-1 text-sm"
                                value={rejectNote}
                                onChange={(e) => setRejectNote(e.target.value)}
                                placeholder="e.g. Scheduling conflict on those dates"
                              />
                            </div>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={reviewMutation.isPending}
                              onClick={() => reject(req.id)}
                            >
                              Confirm Reject
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>Cancel</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Policies section */}
      <TimeOffPolicies />
    </div>
  );
}

function TimeOffPolicies() {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", type: "VACATION" as const });
  const utils = trpc.useUtils();

  const { data: policies } = trpc.timeoff.listPolicies.useQuery();
  const createMutation = trpc.timeoff.createPolicy.useMutation({
    onSuccess: () => {
      utils.timeoff.listPolicies.invalidate();
      setCreating(false);
      setForm({ name: "", type: "VACATION" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Time Off Policies</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setCreating(!creating)}>
          {creating ? "Cancel" : "Add Policy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {creating && (
          <div className="flex gap-3 p-3 bg-gray-50 rounded border">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="Policy name (e.g. Vacation, Sick Leave)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="border rounded px-2 py-1 text-sm"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
            >
              {["VACATION","SICK","PERSONAL","BEREAVEMENT","UNPAID","OTHER"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: form.name, type: form.type, maxRequestDays: 14 })}
            >
              Save
            </Button>
          </div>
        )}
        {policies?.length === 0 && !creating && (
          <p className="text-sm text-gray-500">No policies yet. Add one to allow time-off requests.</p>
        )}
        <div className="space-y-1">
          {policies?.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
              <div>
                <span className="font-medium text-sm">{p.name}</span>
                <span className="ml-2 text-xs text-gray-500">{p.type}</span>
                {p.isPaid && <span className="ml-2 text-xs text-green-600">Paid</span>}
              </div>
              <span className="text-xs text-gray-400">Max {p.maxRequestDays} days/request</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
