"use client";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@primeair/ui";
import { CheckCircle, XCircle, Pencil, Clock, AlertTriangle, Eye, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentPayPeriod, getAdjacentPayPeriod, toDateInputValue } from "@/lib/pay-period";

function fmtTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtMins(m: number | null | undefined) {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h${min > 0 ? ` ${min}m` : ""}`;
}
function toLocalInput(d: Date | string | null) {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const STATUS_OPTIONS = ["ACTIVE", "PENDING", "APPROVED", "REJECTED"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number] | "ALL";

type Entry = {
  id: string;
  status: string;
  clockInAt: Date | string;
  clockOutAt: Date | string | null;
  totalMinutes: number | null;
  regularMinutes: number | null;
  overtimeMinutes: number | null;
  doubleTimeMinutes: number | null;
  breakMinutes: number;
  note: string | null;
  isManual: boolean;
  clockInLat: number | null;
  clockInLng: number | null;
  user: { firstName: string; lastName: string; color: string | null };
  workOrder: { number: number } | null;
  costCode: { code: string; description: string | null } | null;
  approvedBy: { firstName: string; lastName: string } | null;
  approvedAt: Date | string | null;
};

function DetailModal({
  entry,
  open,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onAdminClockOut,
  approving,
  rejecting,
  editing,
  clockingOut,
}: {
  entry: Entry | null;
  open: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onEdit: (id: string, clockIn: string, clockOut: string, reason: string) => void;
  onAdminClockOut: (id: string, clockOutAt: string, reason: string) => void;
  approving: boolean;
  rejecting: boolean;
  editing: boolean;
  clockingOut: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "reject" | "clockout">("view");
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editNote, setEditNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [clockOutNote, setClockOutNote] = useState("");

  function open_edit() {
    if (!entry) return;
    setEditIn(toLocalInput(entry.clockInAt));
    setEditOut(toLocalInput(entry.clockOutAt));
    setEditNote("");
    setMode("edit");
  }

  function open_clockout() {
    setClockOutTime(toLocalInput(new Date()));
    setClockOutNote("");
    setMode("clockout");
  }

  function handleClose() {
    setMode("view");
    setEditNote("");
    setRejectNote("");
    setClockOutNote("");
    onClose();
  }

  if (!entry) return null;

  const isPending = entry.status === "PENDING";
  const isActive = entry.status === "ACTIVE";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: entry.user.color ?? "#1B3A6B" }}
            >
              {entry.user.firstName[0]}{entry.user.lastName[0]}
            </div>
            <div>
              <div>{entry.user.firstName} {entry.user.lastName}</div>
              <div className="text-sm font-normal text-gray-500">{fmtDate(entry.clockInAt)}</div>
            </div>
            <Badge
              variant={
                entry.status === "APPROVED" ? "success"
                : entry.status === "REJECTED" ? "destructive"
                : entry.status === "ACTIVE" ? "warning"
                : "secondary"
              }
              className="ml-auto"
            >
              {entry.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Detail grid */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Clock In</p>
            {mode === "edit"
              ? <Input type="datetime-local" value={editIn} onChange={(e) => setEditIn(e.target.value)} className="h-8 text-sm" />
              : <p className="text-sm font-medium">{fmtDateTime(entry.clockInAt)}</p>
            }
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Clock Out</p>
            {mode === "edit"
              ? <Input type="datetime-local" value={editOut} onChange={(e) => setEditOut(e.target.value)} className="h-8 text-sm" />
              : <p className="text-sm font-medium">
                  {entry.clockOutAt ? fmtDateTime(entry.clockOutAt) : <Badge variant="warning">Active</Badge>}
                </p>
            }
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Regular</p>
            <p className="text-sm font-medium">{fmtMins(entry.regularMinutes)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Overtime</p>
            <p className="text-sm font-medium text-amber-600">{fmtMins(entry.overtimeMinutes)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Double Time</p>
            <p className="text-sm font-medium text-red-600">{fmtMins(entry.doubleTimeMinutes)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Hours</p>
            <p className="text-sm font-bold">{fmtMins(entry.totalMinutes)}</p>
          </div>

          {entry.workOrder && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Work Order</p>
              <p className="text-sm font-medium">WO-{String(entry.workOrder.number).padStart(4, "0")}</p>
            </div>
          )}
          {entry.costCode && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Cost Code</p>
              <p className="text-sm font-medium">{entry.costCode.code}</p>
            </div>
          )}
          {entry.breakMinutes > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Break</p>
              <p className="text-sm">{entry.breakMinutes} min</p>
            </div>
          )}
          {entry.clockInLat && (
            <div className="space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">GPS</p>
              <a
                href={`https://maps.google.com/?q=${entry.clockInLat},${entry.clockInLng}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View location
              </a>
            </div>
          )}
          {entry.approvedBy && (
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Approved by</p>
              <p className="text-sm">{entry.approvedBy.firstName} {entry.approvedBy.lastName} · {entry.approvedAt ? fmtDateTime(entry.approvedAt) : ""}</p>
            </div>
          )}
          {entry.note && (
            <div className="col-span-2 space-y-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Note</p>
              <p className="text-sm text-gray-700">{entry.note}</p>
            </div>
          )}
        </div>

        {/* Edit reason */}
        {mode === "edit" && (
          <div className="space-y-2 pt-1 border-t">
            <p className="text-xs text-gray-500">Reason for edit <span className="text-red-500">*</span></p>
            <Input
              placeholder="Why are you editing this entry?"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="text-sm"
            />
          </div>
        )}

        {/* Reject reason */}
        {mode === "reject" && (
          <div className="space-y-2 pt-1 border-t bg-red-50 -mx-6 px-6 pb-2">
            <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Rejection reason
            </p>
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="text-sm bg-white"
            />
          </div>
        )}

        {/* Admin clock-out */}
        {mode === "clockout" && (
          <div className="space-y-3 pt-1 border-t bg-amber-50 -mx-6 px-6 pb-2">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Manual clock-out
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Clock-out time</p>
              <Input
                type="datetime-local"
                value={clockOutTime}
                onChange={(e) => setClockOutTime(e.target.value)}
                className="text-sm bg-white"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Reason (optional)</p>
              <Input
                placeholder="e.g. Employee forgot to clock out"
                value={clockOutNote}
                onChange={(e) => setClockOutNote(e.target.value)}
                className="text-sm bg-white"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          {mode === "view" && (
            <>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
                <Button variant="outline" size="sm" onClick={open_edit} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit Times
                </Button>
              </div>
              <div className="flex gap-2">
                {isActive && (
                  <Button
                    size="sm"
                    onClick={open_clockout}
                    className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <LogOut className="h-4 w-4" /> Clock Out Employee
                  </Button>
                )}
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode("reject")}
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(entry.id)}
                      disabled={approving}
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {mode === "edit" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode("view")}>Cancel</Button>
              <Button
                size="sm"
                disabled={!editNote.trim() || editing}
                onClick={() => onEdit(entry.id, editIn, editOut, editNote)}
              >
                Save Changes
              </Button>
            </>
          )}

          {mode === "reject" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode("view")}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={rejecting}
                onClick={() => onReject(entry.id, rejectNote || "No reason provided")}
              >
                Confirm Rejection
              </Button>
            </>
          )}

          {mode === "clockout" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode("view")}>Cancel</Button>
              <Button
                size="sm"
                disabled={!clockOutTime || clockingOut}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                onClick={() => onAdminClockOut(entry.id, clockOutTime, clockOutNote || "Manual clock-out by admin")}
              >
                <LogOut className="h-3.5 w-3.5" /> Confirm Clock Out
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TimecardsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalEntry, setModalEntry] = useState<Entry | null>(null);

  // Default to current pay period; overwritten once company settings load
  const [startDate, setStartDate] = useState(() => toDateInputValue(getCurrentPayPeriod("BIWEEKLY").start));
  const [endDate, setEndDate] = useState(() => toDateInputValue(getCurrentPayPeriod("BIWEEKLY").end));
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date | null>(null);

  const utils = trpc.useUtils();

  const { data: payPeriodConfig } = trpc.admin.getPayPeriodConfig.useQuery();

  useEffect(() => {
    if (!payPeriodConfig) return;
    const period = getCurrentPayPeriod(
      payPeriodConfig.payPeriodType,
      payPeriodConfig.payPeriodAnchorDate ? new Date(payPeriodConfig.payPeriodAnchorDate) : null
    );
    setStartDate(toDateInputValue(period.start));
    setEndDate(toDateInputValue(period.end));
    setPeriodLabel(period.label);
    setCurrentPeriodStart(period.start);
  }, [payPeriodConfig]);

  function navigate(direction: -1 | 1) {
    if (!currentPeriodStart || !payPeriodConfig) return;
    const period = getAdjacentPayPeriod(
      currentPeriodStart,
      payPeriodConfig.payPeriodType,
      direction,
      payPeriodConfig.payPeriodAnchorDate ? new Date(payPeriodConfig.payPeriodAnchorDate) : null
    );
    setStartDate(toDateInputValue(period.start));
    setEndDate(toDateInputValue(period.end));
    setPeriodLabel(period.label);
    setCurrentPeriodStart(period.start);
  }

  const { data: entries, isLoading } = trpc.timeclock.listEntries.useQuery({
    startDate: new Date(startDate),
    endDate: new Date(endDate + "T23:59:59"),
    status: statusFilter === "ALL" ? undefined : statusFilter,
    limit: 300,
    offset: 0,
  });

  const approve = trpc.timeclock.approveEntries.useMutation({
    onSuccess: () => {
      setSelectedIds(new Set());
      setModalEntry(null);
      utils.timeclock.listEntries.invalidate();
    },
  });

  const reject = trpc.timeclock.rejectEntry.useMutation({
    onSuccess: () => {
      setModalEntry(null);
      utils.timeclock.listEntries.invalidate();
    },
  });

  const edit = trpc.timeclock.editEntry.useMutation({
    onSuccess: () => {
      setModalEntry(null);
      utils.timeclock.listEntries.invalidate();
    },
  });

  const adminClockOut = trpc.timeclock.adminClockOut.useMutation({
    onSuccess: () => {
      setModalEntry(null);
      utils.timeclock.listEntries.invalidate();
    },
  });

  function toggleAll() {
    if (!entries) return;
    const pending = entries.filter((e) => e.status === "PENDING");
    if (selectedIds.size === pending.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  }

  const pendingEntries = entries?.filter((e) => e.status === "PENDING") ?? [];
  const totalHours = entries?.reduce((s, e) => s + (e.totalMinutes ?? 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timecards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {periodLabel && <span className="font-medium text-gray-700">{periodLabel} · </span>}
            {entries?.length ?? 0} entries · {fmtMins(totalHours)} total
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={() => approve.mutate({ ids: Array.from(selectedIds) })}
            disabled={approve.isPending}
            className="bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Approve {selectedIds.size} Selected
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            disabled={!currentPeriodStart || !payPeriodConfig}
            className="h-9 w-9 p-0"
            title="Previous pay period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setCurrentPeriodStart(null); }} className="w-40 text-sm" />
          <span className="text-gray-400 text-sm">to</span>
          <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setCurrentPeriodStart(null); }} className="w-40 text-sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(1)}
            disabled={!currentPeriodStart || !payPeriodConfig}
            className="h-9 w-9 p-0"
            title="Next pay period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{entries?.length ?? 0} entries</CardTitle>
            {statusFilter === "PENDING" && pendingEntries.length > 0 && (
              <Button
                size="sm"
                onClick={() => approve.mutate({ ids: pendingEntries.map((e) => e.id) })}
                disabled={approve.isPending}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve All ({pendingEntries.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : !entries || entries.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No timecards found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {statusFilter === "PENDING" && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.size === pendingEntries.length && pendingEntries.length > 0}
                          onChange={toggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>In</TableHead>
                    <TableHead>Out</TableHead>
                    <TableHead className="text-right">Reg</TableHead>
                    <TableHead className="text-right">OT</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setModalEntry(entry as unknown as Entry)}
                    >
                      {statusFilter === "PENDING" && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {entry.status === "PENDING" && (
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedIds.has(entry.id)}
                              onChange={() => toggleOne(entry.id)}
                            />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: entry.user.color ?? "#1B3A6B" }}
                          >
                            {entry.user.firstName[0]}{entry.user.lastName[0]}
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            {entry.user.firstName} {entry.user.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{fmtDate(entry.clockInAt)}</TableCell>
                      <TableCell className="text-sm font-mono">{fmtTime(entry.clockInAt)}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {entry.clockOutAt
                          ? fmtTime(entry.clockOutAt)
                          : <Badge variant="warning" className="text-xs">Active</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmtMins(entry.regularMinutes)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {(entry.overtimeMinutes ?? 0) > 0
                          ? <span className="text-amber-600 font-medium">{fmtMins(entry.overtimeMinutes)}</span>
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">{fmtMins(entry.totalMinutes)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {entry.workOrder ? `WO-${String(entry.workOrder.number).padStart(4, "0")}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "APPROVED" ? "success"
                            : entry.status === "REJECTED" ? "destructive"
                            : entry.status === "ACTIVE" ? "warning"
                            : "secondary"
                          }
                          className="text-xs"
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {entry.status === "ACTIVE" && (
                            <button
                              onClick={() => setModalEntry(entry as unknown as Entry)}
                              title="Clock out employee"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors"
                            >
                              <LogOut className="h-3.5 w-3.5" /> Clock Out
                            </button>
                          )}
                          {entry.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => approve.mutate({ ids: [entry.id] })}
                                disabled={approve.isPending}
                                title="Approve"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => { setModalEntry(entry as unknown as Entry); }}
                                title="Reject"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {entry.status !== "PENDING" && entry.status !== "ACTIVE" && (
                            <button
                              onClick={() => setModalEntry(entry as unknown as Entry)}
                              title="View details"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          )}
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

      <DetailModal
        entry={modalEntry}
        open={!!modalEntry}
        onClose={() => setModalEntry(null)}
        onApprove={(id) => approve.mutate({ ids: [id] })}
        onReject={(id, reason) => reject.mutate({ id, reason })}
        onEdit={(id, clockIn, clockOut, reason) =>
          edit.mutate({
            timeEntryId: id,
            clockInAt: clockIn ? new Date(clockIn) : undefined,
            clockOutAt: clockOut ? new Date(clockOut) : undefined,
            reason,
          })
        }
        onAdminClockOut={(id, clockOutAt, reason) =>
          adminClockOut.mutate({ timeEntryId: id, clockOutAt: new Date(clockOutAt), reason })
        }
        approving={approve.isPending}
        rejecting={reject.isPending}
        editing={edit.isPending}
        clockingOut={adminClockOut.isPending}
      />
    </div>
  );
}
