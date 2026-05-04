"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Badge, Input, Label, Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import {
  ArrowLeft, Edit2, Check, X, UserPlus, Trash2,
  DollarSign, Clock, AlertTriangle, MessageSquare, Users,
  MapPin, Building2, Home, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_CONFIG = {
  OPEN:        { label: "Open",        color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  COMPLETE:    { label: "Complete",    color: "bg-green-100 text-green-700" },
  CANCELLED:   { label: "Cancelled",   color: "bg-gray-100 text-gray-500" },
} as const;

const FIN_CONFIG = {
  UNPAID:        { label: "Unpaid",         color: "bg-red-100 text-red-700" },
  INVOICED:      { label: "Invoiced",       color: "bg-blue-100 text-blue-700" },
  PARTIALLY_PAID:{ label: "Partially Paid", color: "bg-amber-100 text-amber-700" },
  PAID:          { label: "Paid",           color: "bg-green-100 text-green-700" },
  VOID:          { label: "Void",           color: "bg-gray-100 text-gray-500" },
} as const;

type POStatus = keyof typeof STATUS_CONFIG;
type FinStatus = keyof typeof FIN_CONFIG;

function StatusBadge({ value, config }: { value: string; config: Record<string, { label: string; color: string }> }) {
  const c = config[value] ?? { label: value, color: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.color}`}>{c.label}</span>;
}

function InlineEdit({ label, value, onSave, type = "text", placeholder = "" }: {
  label: string; value: string; onSave: (v: string) => void; type?: string; placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  if (editing) return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex gap-1.5">
        <Input type={type} value={draft} onChange={e => setDraft(e.target.value)}
          className="h-8 text-sm" placeholder={placeholder} autoFocus
          onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
        <Button size="sm" className="h-8 px-2" onClick={commit}><Check className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setDraft(value); setEditing(false); }}><X className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );

  return (
    <div className="group cursor-pointer space-y-0.5" onClick={() => { setDraft(value); setEditing(true); }}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 font-medium group-hover:text-primary transition-colors min-h-[1.25rem]">
        {value || <span className="text-gray-400 italic font-normal">—</span>}
        <Edit2 className="h-3 w-3 ml-1.5 inline opacity-0 group-hover:opacity-50 transition-opacity" />
      </p>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value}</p>
    </div>
  );
}

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const [noteText, setNoteText] = useState("");
  const [assignSearch, setAssignSearch] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(true);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const { data: po, isLoading } = trpc.purchaseOrders.get.useQuery({ id });
  const { data: allUsers } = trpc.users.list.useQuery({ isActive: true });

  const refresh = () => utils.purchaseOrders.get.invalidate({ id });

  const update = trpc.purchaseOrders.update.useMutation({ onSuccess: refresh });
  const updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => { refresh(); setStatusError(null); },
    onError: e => setStatusError(e.message),
  });
  const updateFin = trpc.purchaseOrders.updateFinancialStatus.useMutation({ onSuccess: refresh });
  const addAssignment = trpc.purchaseOrders.addAssignment.useMutation({ onSuccess: refresh });
  const removeAssignment = trpc.purchaseOrders.removeAssignment.useMutation({ onSuccess: refresh });
  const addNote = trpc.purchaseOrders.addNote.useMutation({
    onSuccess: () => { refresh(); setNoteText(""); },
  });
  const deleteNote = trpc.purchaseOrders.deleteNote.useMutation({ onSuccess: refresh });

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!po) return <div className="p-6 text-gray-500">Job not found.</div>;

  const customerName = po.customer?.companyName
    ?? (po.customer ? `${po.customer.firstName} ${po.customer.lastName ?? ""}`.trim() : "");

  const assignedIds = new Set(po.assignments.map(a => a.userId));
  const unassignedUsers = (allUsers ?? []).filter(u =>
    !assignedIds.has(u.id) &&
    (u.firstName + " " + u.lastName).toLowerCase().includes(assignSearch.toLowerCase())
  );

  const totalHours = po.timeEntries.reduce((sum, e) => {
    if (!e.clockOutAt) return sum;
    return sum + (new Date(e.clockOutAt).getTime() - new Date(e.clockInAt).getTime()) / 3600000;
  }, 0);

  const canComplete = ["PAID", "VOID"].includes(po.financialStatus);
  const canCancel = ["UNPAID", "VOID"].includes(po.financialStatus);

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">{po.number}</h1>
              <StatusBadge value={po.status} config={STATUS_CONFIG} />
              <StatusBadge value={po.financialStatus} config={FIN_CONFIG} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{po.description || "No description"}</p>
          </div>
        </div>
        {/* Status controls */}
        <div className="flex gap-2 items-center">
          <Select value={po.financialStatus}
            onValueChange={v => updateFin.mutate({ id: po.id, financialStatus: v as FinStatus })}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FIN_CONFIG).map(([v, c]) => (
                <SelectItem key={v} value={v}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={po.status}
            onValueChange={v => updateStatus.mutate({ id: po.id, status: v as POStatus })}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <SelectItem key={v} value={v} disabled={
                  (v === "COMPLETE" && !canComplete) || (v === "CANCELLED" && !canCancel)
                }>
                  {c.label}
                  {v === "COMPLETE" && !canComplete ? " (needs payment)" : ""}
                  {v === "CANCELLED" && !canCancel ? " (resolve balance)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {statusError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {statusError}
        </div>
      )}

      {/* Financial safeguard banner */}
      {(po.status === "OPEN" || po.status === "IN_PROGRESS") && po.financialStatus !== "PAID" && po.financialStatus !== "VOID" && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          This PO cannot be marked Complete until payment is collected. Current financial status: <strong className="ml-1">{FIN_CONFIG[po.financialStatus as FinStatus]?.label}</strong>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left column — details + assignments + time entries */}
        <div className="col-span-2 space-y-6">
          {/* Core details */}
          <Card>
            <CardHeader><CardTitle className="text-base">PO Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-5">
              <InlineEdit label="PO Number" value={po.number}
                onSave={v => update.mutate({ id: po.id, number: v })} placeholder="PO-2025-001" />
              <InlineEdit label="Description" value={po.description ?? ""}
                onSave={v => update.mutate({ id: po.id, description: v || null })} placeholder="e.g. HVAC installation" />
              <InlineEdit label="Customer" value={customerName}
                onSave={_ => {}} placeholder="Customer name" />
              <InlineEdit label="Issued Date" value={po.issuedAt ? new Date(po.issuedAt).toISOString().slice(0,10) : ""}
                onSave={v => update.mutate({ id: po.id, issuedAt: v || null })} type="date" />
              <InlineEdit label="Due Date" value={po.dueAt ? new Date(po.dueAt).toISOString().slice(0,10) : ""}
                onSave={v => update.mutate({ id: po.id, dueAt: v || null })} type="date" />
              <InlineEdit label="Authorized Amount ($)" value={po.amount != null ? String(po.amount) : ""}
                onSave={v => update.mutate({ id: po.id, amount: v ? Number(v) : null })} type="number" placeholder="0.00" />
              <InlineEdit label="Amount Spent ($)" value={po.amountSpent != null ? String(po.amountSpent) : ""}
                onSave={v => update.mutate({ id: po.id, amountSpent: v ? Number(v) : null })} type="number" placeholder="0.00" />
              <div className="col-span-2 space-y-1">
                <p className="text-xs text-gray-500">Internal Notes</p>
                <InlineEdit label="" value={po.notes ?? ""}
                  onSave={v => update.mutate({ id: po.id, notes: v || null })} placeholder="Any internal details..." />
              </div>
            </CardContent>
          </Card>

          {/* Job details (import fields) */}
          {(po.jobType || po.address || po.customerName || po.salesperson || po.permitNumber || po.installDate) && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setJobDetailsOpen(o => !o)}>
                <CardTitle className="text-base flex items-center gap-2">
                  {po.jobType === "COMMERCIAL" ? (
                    <Building2 className="h-4 w-4 text-blue-500" />
                  ) : po.jobType === "RESIDENTIAL" ? (
                    <Home className="h-4 w-4 text-green-500" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  Job Details
                  {po.jobType && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      po.jobType === "COMMERCIAL" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                    }`}>{po.jobType === "COMMERCIAL" ? "Commercial" : "Residential"}</span>
                  )}
                  <span className="ml-auto">
                    {jobDetailsOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </span>
                </CardTitle>
              </CardHeader>
              {jobDetailsOpen && (
                <CardContent className="space-y-5">
                  {/* Job Info */}
                  {(po.customerName || po.address || po.salesperson || po.gcName || po.billedPercent) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Job Info</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <DetailField label="Job Name" value={po.customerName} />
                        <DetailField label="Salesperson" value={po.salesperson} />
                        <DetailField label="Address" value={po.address} />
                        {po.jobType === "COMMERCIAL" && <DetailField label="General Contractor" value={po.gcName} />}
                        {po.jobType === "COMMERCIAL" && <DetailField label="Billed %" value={po.billedPercent} />}
                      </div>
                    </div>
                  )}

                  {/* Permit */}
                  {(po.permitNumber || po.permitJurisdiction || po.permitStatus || po.permitExpDate || po.nocRequired != null) && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Permit</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <DetailField label="Permit #" value={po.permitNumber} />
                        <DetailField label="Jurisdiction" value={po.permitJurisdiction} />
                        <DetailField label="Status" value={po.permitStatus} />
                        <DetailField label="Expires" value={po.permitExpDate ? new Date(po.permitExpDate).toLocaleDateString() : null} />
                        {po.jobType === "COMMERCIAL" && po.nocRequired != null && (
                          <DetailField label="NOC Required" value={po.nocRequired ? "Yes" : "No"} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scheduling */}
                  {(po.installDate || po.startupDate || po.inspectionStatus || po.inspectionScheduledDate || po.registeredDate) && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Scheduling</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <DetailField label="Install Date" value={po.installDate ? new Date(po.installDate).toLocaleDateString() : null} />
                        <DetailField label="Start Up Date" value={po.startupDate ? new Date(po.startupDate).toLocaleDateString() : null} />
                        <DetailField label="Inspection Status" value={po.inspectionStatus} />
                        {po.jobType === "RESIDENTIAL" && (
                          <DetailField label="Inspection Scheduled" value={po.inspectionScheduledDate ? new Date(po.inspectionScheduledDate).toLocaleDateString() : null} />
                        )}
                        {po.jobType === "RESIDENTIAL" && (
                          <DetailField label="Registered" value={po.registeredDate ? new Date(po.registeredDate).toLocaleDateString() : null} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Other */}
                  {(po.extendedWarranty != null || po.redYellowTag || po.rma || po.nto || po.firstDayOnJob || po.lastDayOnJob || po.reinspection != null) && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Other</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {po.extendedWarranty != null && <DetailField label="Extended Warranty" value={po.extendedWarranty ? "Yes" : "No"} />}
                        {po.jobType === "RESIDENTIAL" && <DetailField label="Red/Yellow Tag" value={po.redYellowTag} />}
                        {po.jobType === "RESIDENTIAL" && <DetailField label="RMA" value={po.rma} />}
                        {po.jobType === "RESIDENTIAL" && po.reinspection != null && <DetailField label="Re-inspection" value={po.reinspection ? "Yes" : "No"} />}
                        {po.jobType === "COMMERCIAL" && <DetailField label="NTO" value={po.nto} />}
                        {po.jobType === "COMMERCIAL" && <DetailField label="First Day on Job" value={po.firstDayOnJob ? new Date(po.firstDayOnJob).toLocaleDateString() : null} />}
                        {po.jobType === "COMMERCIAL" && <DetailField label="Last Day on Job" value={po.lastDayOnJob ? new Date(po.lastDayOnJob).toLocaleDateString() : null} />}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Assigned workers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Assigned Workers
                  {po.assignments.length > 0 && <span className="text-xs font-normal text-gray-400">({po.assignments.length})</span>}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {po.assignments.length > 0 ? (
                <div className="divide-y">
                  {po.assignments.map(a => (
                    <div key={a.userId} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: a.user.color ?? "#6b7280" }}>
                          {a.user.firstName[0]}{a.user.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.user.firstName} {a.user.lastName}</p>
                          <p className="text-xs text-gray-500">{a.user.title ?? a.user.jobType}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-red-500"
                        onClick={() => removeAssignment.mutate({ purchaseOrderId: po.id, userId: a.userId })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No workers assigned yet.</p>
              )}

              {/* Add worker */}
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Add worker</p>
                <Input placeholder="Search by name..." value={assignSearch}
                  onChange={e => setAssignSearch(e.target.value)} className="h-8 text-sm mb-2" />
                {assignSearch.length > 0 && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {unassignedUsers.length === 0 ? (
                      <p className="text-xs text-gray-400 p-2 italic">No matching unassigned workers</p>
                    ) : unassignedUsers.slice(0, 8).map(u => (
                      <button key={u.id}
                        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left"
                        onClick={() => { addAssignment.mutate({ purchaseOrderId: po.id, userId: u.id }); setAssignSearch(""); }}>
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: (u as { color?: string }).color ?? "#6b7280" }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                          <p className="text-xs text-gray-400">{(u as { title?: string }).title ?? u.jobType}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time entries */}
          {po.timeEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Time Logged
                  <span className="text-xs font-normal text-gray-400">
                    {totalHours.toFixed(1)} hrs across {po._count.timeEntries} {po._count.timeEntries === 1 ? "entry" : "entries"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Worker</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Cost Code</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.timeEntries.map(e => {
                      const hours = e.clockOutAt
                        ? ((new Date(e.clockOutAt).getTime() - new Date(e.clockInAt).getTime()) / 3600000).toFixed(1)
                        : "Active";
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-sm">
                            {e.user.firstName} {e.user.lastName}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                            {new Date(e.clockInAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm text-gray-700">{hours}</TableCell>
                          <TableCell className="text-xs text-gray-500">{e.costCode?.code ?? "—"}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              e.status === "APPROVED" ? "bg-green-100 text-green-700" :
                              e.status === "ACTIVE" ? "bg-blue-100 text-blue-700" :
                              e.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>{e.status}</span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — financial summary + notes */}
        <div className="space-y-6">
          {/* Financial summary */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Financials</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Authorized</span>
                  <span className="font-semibold text-gray-900">
                    {po.amount != null ? `$${Number(po.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Spent</span>
                  <span className={`font-semibold ${
                    po.amountSpent != null && po.amount != null && Number(po.amountSpent) > Number(po.amount)
                      ? "text-red-600" : "text-gray-900"
                  }`}>
                    {po.amountSpent != null ? `$${Number(po.amountSpent).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
                {po.amount != null && po.amountSpent != null && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-500">Remaining</span>
                    <span className={`font-bold ${Number(po.amount) - Number(po.amountSpent) < 0 ? "text-red-600" : "text-green-700"}`}>
                      ${(Number(po.amount) - Number(po.amountSpent)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-1.5">
                <p className="text-xs text-gray-500">Payment Status</p>
                <Select value={po.financialStatus}
                  onValueChange={v => updateFin.mutate({ id: po.id, financialStatus: v as FinStatus })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIN_CONFIG).map(([v, c]) => (
                      <SelectItem key={v} value={v}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canComplete && (
                  <p className="text-xs text-amber-600 flex items-start gap-1 mt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    PO cannot be closed until marked Paid or Void
                  </p>
                )}
              </div>

              <div className="border-t pt-3 space-y-1.5 text-xs text-gray-500">
                {po.issuedAt && <div className="flex justify-between"><span>Issued</span><span>{new Date(po.issuedAt).toLocaleDateString()}</span></div>}
                {po.dueAt && <div className="flex justify-between"><span>Due</span><span className={new Date(po.dueAt) < new Date() && po.status !== "COMPLETE" ? "text-red-600 font-medium" : ""}>{new Date(po.dueAt).toLocaleDateString()}</span></div>}
                <div className="flex justify-between"><span>Hours logged</span><span>{totalHours.toFixed(1)} hrs</span></div>
                <div className="flex justify-between"><span>Created</span><span>{new Date(po.createdAt).toLocaleDateString()}</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Notes
                {po.noteHistory.length > 0 && <span className="text-xs font-normal text-gray-400">({po.noteHistory.length})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add note */}
              <div className="space-y-2">
                <Textarea
                  ref={noteRef}
                  rows={3}
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="text-sm"
                />
                <Button size="sm" className="w-full" disabled={!noteText.trim() || addNote.isPending}
                  onClick={() => addNote.mutate({ purchaseOrderId: po.id, content: noteText.trim() })}>
                  {addNote.isPending ? "Saving..." : "Add Note"}
                </Button>
              </div>

              {/* Note history */}
              {po.noteHistory.length > 0 && (
                <div className="space-y-3 border-t pt-3">
                  {po.noteHistory.map(note => (
                    <div key={note.id} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: note.author.color ?? "#6b7280" }}>
                            {note.author.firstName[0]}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{note.author.firstName} {note.author.lastName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                            onClick={() => deleteNote.mutate({ noteId: note.id })}>
                            <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-7">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
