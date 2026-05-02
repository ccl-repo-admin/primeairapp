"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Prisma } from "@primeair/db";
import { compressImage } from "@/lib/compress-image";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Input,
} from "@primeair/ui";
import {
  ArrowLeft, MapPin, Clock, User, CheckCircle, AlertTriangle,
  Camera, Plus, Trash2, Pin, PinOff, Image as ImageIcon,
  MessageSquare, Package, Wrench, ClipboardCheck, Timer, History,
  Pencil, ExternalLink, Phone, Mail, ChevronDown, ChevronRight as ChevronRight2,
  AlertCircle, Loader2, X,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  NEW: "secondary", SCHEDULED: "secondary", DISPATCHED: "warning",
  EN_ROUTE: "warning", IN_PROGRESS: "success", ON_HOLD: "default",
  COMPLETE: "success", INVOICED: "default", PAID: "success", CANCELLED: "destructive",
};
const PRIORITY_COLORS: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
  EMERGENCY: "destructive", HIGH: "warning", NORMAL: "secondary", LOW: "default",
};
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["DISPATCHED", "NEW", "CANCELLED"],
  DISPATCHED: ["EN_ROUTE", "SCHEDULED", "CANCELLED"],
  EN_ROUTE: ["IN_PROGRESS", "DISPATCHED"],
  IN_PROGRESS: ["COMPLETE", "ON_HOLD", "EN_ROUTE"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETE: ["INVOICED", "IN_PROGRESS"],
  INVOICED: ["PAID", "COMPLETE"],
  PAID: ["CANCELLED"],
  CANCELLED: ["NEW"],
};
const PHOTO_TYPE_LABELS: Record<string, string> = {
  BEFORE: "Before", AFTER: "After", EQUIPMENT: "Equipment",
  DAMAGE: "Damage", PERMIT: "Permit", OTHER: "Other",
};
const PHOTO_TYPE_COLORS: Record<string, string> = {
  BEFORE: "bg-blue-100 text-blue-700", AFTER: "bg-green-100 text-green-700",
  EQUIPMENT: "bg-gray-100 text-gray-700", DAMAGE: "bg-red-100 text-red-700",
  PERMIT: "bg-purple-100 text-purple-700", OTHER: "bg-gray-100 text-gray-600",
};
const PART_STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700 border-amber-200",
  ORDERED: "bg-blue-100 text-blue-700 border-blue-200",
  RECEIVED: "bg-green-100 text-green-700 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};
const NOTE_VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL: "Internal", FIELD: "Field Team", CUSTOMER: "Customer",
};
const NOTE_VISIBILITY_COLORS: Record<string, string> = {
  INTERNAL: "bg-amber-50 border-amber-200",
  FIELD: "bg-blue-50 border-blue-200",
  CUSTOMER: "bg-green-50 border-green-200",
};
const DIAG_PRESETS = [
  "Return Temp (°F)", "Supply Temp (°F)", "Delta T (°F)",
  "Suction Pressure (PSI)", "Discharge Pressure (PSI)",
  "Superheat (°F)", "Subcooling (°F)", "Refrigerant Type",
  "Amps (compressor)", "Voltage (L1-L2)", "Blower Amps",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function fmtMins(m: number | null) {
  if (!m) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min > 0 ? `${min}m` : ""}`.trim() : `${min}m`;
}
function timeAgo(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(d);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type WO = Prisma.WorkOrderGetPayload<{
  include: {
    customer: true;
    serviceAddress: true;
    asset: true;
    assignments: { include: { user: { select: { id: true; firstName: true; lastName: true; color: true } } } };
    timeEntries: {
      select: {
        id: true; clockInAt: true; clockOutAt: true; totalMinutes: true; status: true;
        user: { select: { id: true; firstName: true; lastName: true } };
      };
    };
    statusHistory: true;
    createdBy: { select: { id: true; firstName: true; lastName: true } };
    photos: { include: { uploadedBy: { select: { id: true; firstName: true; lastName: true } } } };
    notes: { include: { author: { select: { id: true; firstName: true; lastName: true; color: true } } } };
    partRequests: { include: { requestedBy: { select: { id: true; firstName: true; lastName: true } } } };
    partUsages: { include: { part: { select: { id: true; name: true; sku: true; unit: true } } } };
    checklists: { include: { items: true } };
  };
}>;

function PhotoGrid({ wo, onRefresh }: { wo: WO; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [captionInput, setCaptionInput] = useState("");
  const [photoTypeInput, setPhotoTypeInput] = useState<string>("OTHER");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhoto = trpc.workOrders.addPhoto.useMutation({ onSuccess: onRefresh });
  const deletePhoto = trpc.workOrders.deletePhoto.useMutation({ onSuccess: onRefresh });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErr("");
    try {
      for (const raw of Array.from(files)) {
        const file = await compressImage(raw);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { setUploadErr("Upload failed. Try again."); continue; }
        const { url } = await res.json();
        await addPhoto.mutateAsync({
          workOrderId: wo.id,
          url,
          caption: captionInput || undefined,
          photoType: photoTypeInput as never,
        });
      }
      setCaptionInput("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Select value={photoTypeInput} onValueChange={setPhotoTypeInput}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Photo type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PHOTO_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Caption (optional)"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              className="col-span-2 text-sm"
            />
          </div>
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-blue-50/30 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </div>
            ) : (
              <>
                <Camera className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click or drag photos here</p>
                <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · max 10 MB each</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          {uploadErr && <p className="text-xs text-red-500 mt-1">{uploadErr}</p>}
        </CardContent>
      </Card>

      {/* Photo grid */}
      {wo.photos.length === 0 ? (
        <div className="text-center py-12">
          <ImageIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No photos yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {wo.photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden border bg-gray-50 aspect-square">
              <img
                src={photo.url}
                alt={photo.caption ?? "Photo"}
                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setLightbox(photo.url)}
              />
              <div className="absolute top-2 left-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PHOTO_TYPE_COLORS[photo.photoType] ?? ""}`}>
                  {PHOTO_TYPE_LABELS[photo.photoType] ?? photo.photoType}
                </span>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-1 bg-white/90 rounded-full shadow-sm hover:bg-red-50 text-red-500"
                  onClick={() => deletePhoto.mutate({ photoId: photo.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-xs p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="truncate">{photo.uploadedBy.firstName} · {fmtDate(photo.takenAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function NotesPanel({ wo, onRefresh }: { wo: WO; onRefresh: () => void }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("INTERNAL");

  const addNote = trpc.workOrders.addNote.useMutation({
    onSuccess: () => { setBody(""); onRefresh(); },
  });
  const deleteNote = trpc.workOrders.deleteNote.useMutation({ onSuccess: onRefresh });
  const pinNote = trpc.workOrders.pinNote.useMutation({ onSuccess: onRefresh });

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={3}
            placeholder="Add a note..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INTERNAL">Internal only</SelectItem>
                <SelectItem value="FIELD">Field team</SelectItem>
                <SelectItem value="CUSTOMER">Customer-visible</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!body.trim() || addNote.isPending}
              onClick={() => addNote.mutate({ workOrderId: wo.id, body, visibility: visibility as never })}
            >
              {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {wo.notes.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {wo.notes.map((note) => (
            <div
              key={note.id}
              className={`border rounded-xl p-4 ${NOTE_VISIBILITY_COLORS[note.visibility] ?? "bg-white border-gray-200"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: note.author.color ?? "#1B3A6B" }}
                  >
                    {note.author.firstName[0]}{note.author.lastName[0]}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{note.author.firstName} {note.author.lastName}</span>
                    <span className="text-xs text-gray-400 ml-2">{timeAgo(note.createdAt)}</span>
                    {note.editedAt && <span className="text-xs text-gray-400 ml-1">(edited)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 bg-white/60 border rounded text-gray-500">
                    {NOTE_VISIBILITY_LABELS[note.visibility]}
                  </span>
                  {note.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500" />}
                  <button
                    className="p-1 hover:bg-black/10 rounded"
                    onClick={() => pinNote.mutate({ noteId: note.id, isPinned: !note.isPinned })}
                    title={note.isPinned ? "Unpin" : "Pin"}
                  >
                    {note.isPinned ? <PinOff className="h-3.5 w-3.5 text-gray-400" /> : <Pin className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                  <button
                    className="p-1 hover:bg-black/10 rounded text-red-400"
                    onClick={() => deleteNote.mutate({ noteId: note.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartsPanel({ wo, onRefresh }: { wo: WO; onRefresh: () => void }) {
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [urgency, setUrgency] = useState("STANDARD");
  const [notes, setNotes] = useState("");

  const addReq = trpc.workOrders.addPartRequest.useMutation({
    onSuccess: () => { setName(""); setPartNumber(""); setQuantity("1"); setNotes(""); onRefresh(); },
  });
  const updateReq = trpc.workOrders.updatePartRequest.useMutation({ onSuccess: onRefresh });
  const deleteReq = trpc.workOrders.deletePartRequest.useMutation({ onSuccess: onRefresh });

  const totalPartsValue = wo.partUsages.reduce(
    (sum, p) => sum + Number(p.unitPrice) * Number(p.quantity), 0
  );

  return (
    <div className="space-y-6">
      {/* Part requests */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Part Requests
          {wo.partRequests.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
              {wo.partRequests.filter(r => r.status === "REQUESTED").length} pending
            </span>
          )}
        </h3>

        {/* Add request form */}
        <Card className="mb-3">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Part name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-2 text-sm"
              />
              <Input
                placeholder="Part # (optional)"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Qty"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-sm"
              />
            </div>
            <Input
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
            <div className="flex items-center justify-between">
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger className="w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!name.trim() || addReq.isPending}
                onClick={() =>
                  addReq.mutate({
                    workOrderId: wo.id, name, partNumber: partNumber || undefined,
                    quantity: parseInt(quantity) || 1,
                    urgency: urgency as never, notes: notes || undefined,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Request Part
              </Button>
            </div>
          </CardContent>
        </Card>

        {wo.partRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No part requests</p>
        ) : (
          <div className="space-y-2">
            {wo.partRequests.map((req) => (
              <div key={req.id} className={`border rounded-xl p-3 ${PART_STATUS_COLORS[req.status] ?? ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{req.name}</span>
                      {req.partNumber && <span className="text-xs text-gray-500">#{req.partNumber}</span>}
                      <span className="text-xs text-gray-500">× {req.quantity}</span>
                      {req.urgency === "URGENT" && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">URGENT</span>
                      )}
                    </div>
                    {req.notes && <p className="text-xs text-gray-600 mt-0.5">{req.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {req.requestedBy.firstName} {req.requestedBy.lastName} · {timeAgo(req.createdAt)}
                      {req.orderedAt && ` · Ordered ${fmtDate(req.orderedAt)}`}
                      {req.receivedAt && ` · Received ${fmtDate(req.receivedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Select
                      value={req.status}
                      onValueChange={(v) => updateReq.mutate({ id: req.id, status: v as never })}
                    >
                      <SelectTrigger className="h-7 text-xs w-32 border-current">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REQUESTED">Requested</SelectItem>
                        <SelectItem value="ORDERED">Ordered</SelectItem>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <button
                      className="p-1 hover:bg-black/10 rounded text-red-400"
                      onClick={() => deleteReq.mutate({ id: req.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parts used */}
      {wo.partUsages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-400" />
            Parts Used
            <span className="text-gray-400 font-normal ml-auto">
              Total: ${totalPartsValue.toFixed(2)}
            </span>
          </h3>
          <div className="space-y-2">
            {wo.partUsages.map((pu) => (
              <div key={pu.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{pu.part.name}</span>
                  {pu.part.sku && <span className="text-xs text-gray-500 ml-2">#{pu.part.sku}</span>}
                </div>
                <div className="text-right text-gray-600">
                  <span>{Number(pu.quantity)} {pu.part.unit}</span>
                  <span className="ml-3 font-medium">${(Number(pu.unitPrice) * Number(pu.quantity)).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistPanel({ wo, onRefresh }: { wo: WO; onRefresh: () => void }) {
  const [newName, setNewName] = useState("");
  const [newItems, setNewItems] = useState("Check refrigerant levels\nInspect air filter\nTest thermostat\nCheck condensate drain\nInspect electrical connections");
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const addChecklist = trpc.workOrders.addChecklist.useMutation({
    onSuccess: () => { setNewName(""); onRefresh(); },
  });
  const addItem = trpc.workOrders.addChecklistItem.useMutation({ onSuccess: onRefresh });
  const toggleItem = trpc.workOrders.toggleChecklistItem.useMutation({ onSuccess: onRefresh });
  const deleteItem = trpc.workOrders.deleteChecklistItem.useMutation({ onSuccess: onRefresh });

  const totalItems = wo.checklists.reduce((s, c) => s + c.items.length, 0);
  const completedItems = wo.checklists.reduce((s, c) => s + c.items.filter(i => i.isComplete).length, 0);

  return (
    <div className="space-y-4">
      {wo.checklists.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="h-4 w-4 text-green-500" />
          {completedItems} / {totalItems} items complete
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full ml-2">
            <div
              className="h-1.5 bg-green-500 rounded-full transition-all"
              style={{ width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {wo.checklists.map((checklist) => {
        const done = checklist.items.filter(i => i.isComplete).length;
        return (
          <Card key={checklist.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{checklist.name}</CardTitle>
                <span className="text-xs text-gray-400">{done}/{checklist.items.length}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklist.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <input
                    type="checkbox"
                    checked={item.isComplete}
                    onChange={(e) => toggleItem.mutate({ itemId: item.id, isComplete: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary cursor-pointer"
                  />
                  <span className={`text-sm flex-1 ${item.isComplete ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {item.text}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:bg-red-50 rounded"
                    onClick={() => deleteItem.mutate({ itemId: item.id })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {/* Add item inline */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Input
                  placeholder="Add item..."
                  value={newItemText[checklist.id] ?? ""}
                  onChange={(e) => setNewItemText(p => ({ ...p, [checklist.id]: e.target.value }))}
                  className="text-sm h-7"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newItemText[checklist.id]?.trim()) {
                      addItem.mutate({ checklistId: checklist.id, text: newItemText[checklist.id]! });
                      setNewItemText(p => ({ ...p, [checklist.id]: "" }));
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2"
                  disabled={!newItemText[checklist.id]?.trim()}
                  onClick={() => {
                    addItem.mutate({ checklistId: checklist.id, text: newItemText[checklist.id]! });
                    setNewItemText(p => ({ ...p, [checklist.id]: "" }));
                  }}
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* New checklist form */}
      <Card className="border-dashed">
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add Checklist</p>
          <Input
            placeholder="Checklist name (e.g. AC Tune-Up)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="text-sm"
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            rows={5}
            placeholder="One item per line"
            value={newItems}
            onChange={(e) => setNewItems(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!newName.trim() || !newItems.trim() || addChecklist.isPending}
            onClick={() =>
              addChecklist.mutate({
                workOrderId: wo.id,
                name: newName,
                items: newItems.split("\n").map(s => s.trim()).filter(Boolean),
              })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Checklist
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DiagnosticsPanel({ wo, onRefresh }: { wo: WO; onRefresh: () => void }) {
  const existing = (wo.diagnostics as Record<string, string> | null) ?? {};
  const [readings, setReadings] = useState<Record<string, string>>(existing);
  const [customKey, setCustomKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateDiag = trpc.workOrders.updateDiagnostics.useMutation({
    onSuccess: () => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); onRefresh(); },
  });

  const addPreset = (key: string) => {
    if (!readings[key]) setReadings(p => ({ ...p, [key]: "" }));
  };
  const addCustom = () => {
    if (customKey.trim() && !readings[customKey.trim()]) {
      setReadings(p => ({ ...p, [customKey.trim()]: "" }));
      setCustomKey("");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Diagnostic Readings</CardTitle>
          <p className="text-xs text-gray-400">Document measurements from the equipment diagnostic</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Presets */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Common readings (click to add):</p>
            <div className="flex flex-wrap gap-1.5">
              {DIAG_PRESETS.filter(p => !readings[p]).map(p => (
                <button
                  key={p}
                  onClick={() => addPreset(p)}
                  className="text-xs px-2 py-1 border rounded-full hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-gray-500"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Active readings */}
          {Object.keys(readings).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No readings yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(readings).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-44 shrink-0">{key}</span>
                  <Input
                    value={value}
                    onChange={(e) => setReadings(p => ({ ...p, [key]: e.target.value }))}
                    placeholder="—"
                    className="text-sm h-8 flex-1"
                  />
                  <button
                    className="p-1 text-gray-300 hover:text-red-400"
                    onClick={() => setReadings(p => { const n = { ...p }; delete n[key]; return n; })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom field */}
          <div className="flex items-center gap-2 border-t pt-3">
            <Input
              placeholder="Custom reading name"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="text-sm h-8"
              onKeyDown={(e) => e.key === "Enter" && addCustom()}
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addCustom}>Add</Button>
          </div>

          <Button
            size="sm"
            className="w-full"
            disabled={updateDiag.isPending}
            onClick={() => updateDiag.mutate({ workOrderId: wo.id, diagnostics: readings })}
          >
            {saved ? "Saved!" : updateDiag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Readings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "photos" | "notes" | "parts" | "checklist" | "diagnostics" | "time" | "history";

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<Tab>("overview");
  const [statusNote, setStatusNote] = useState("");
  const [nextStatus, setNextStatus] = useState("");

  const { data: _wo, isLoading } = trpc.workOrders.getById.useQuery({ id });
  const wo = _wo as WO | undefined;

  const updateStatus = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => {
      utils.workOrders.getById.invalidate({ id });
      utils.workOrders.list.invalidate();
      setNextStatus(""); setStatusNote("");
    },
  });

  const refresh = () => utils.workOrders.getById.invalidate({ id });

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!wo) {
    return (
      <div className="p-6">
        <p className="text-red-500">Work order not found.</p>
        <Link href="/work-orders"><Button variant="ghost" size="sm" className="mt-2"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </div>
    );
  }

  const allowed = ALLOWED_TRANSITIONS[wo.status] ?? [];
  const photoCount = wo.photos.length;
  const noteCount = wo.notes.length;
  const partReqCount = wo.partRequests.filter(r => r.status === "REQUESTED").length;
  const checkTotal = wo.checklists.reduce((s, c) => s + c.items.length, 0);
  const checkDone = wo.checklists.reduce((s, c) => s + c.items.filter(i => i.isComplete).length, 0);
  const totalMinutes = wo.timeEntries.reduce((s, te) => s + (te.totalMinutes ?? 0), 0);
  const hasDiag = Object.keys((wo.diagnostics as object | null) ?? {}).length > 0;

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "photos", label: "Photos", badge: photoCount > 0 ? String(photoCount) : undefined },
    { id: "notes", label: "Notes", badge: noteCount > 0 ? String(noteCount) : undefined },
    { id: "parts", label: "Parts", badge: partReqCount > 0 ? `${partReqCount}` : undefined },
    { id: "checklist", label: "Checklist", badge: checkTotal > 0 ? `${checkDone}/${checkTotal}` : undefined },
    { id: "diagnostics", label: "Diagnostics", badge: hasDiag ? "✓" : undefined },
    { id: "time", label: "Time", badge: totalMinutes > 0 ? fmtMins(totalMinutes) : undefined },
    { id: "history", label: "History" },
  ];

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href="/work-orders">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Work Orders</Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">WO-{String(wo.number).padStart(4, "0")}</h1>
          <Badge variant={STATUS_COLORS[wo.status] ?? "default"}>{wo.status.replace(/_/g, " ")}</Badge>
          <Badge variant={PRIORITY_COLORS[wo.priority] ?? "default"}>{wo.priority}</Badge>
          {wo.status === "ON_HOLD" && partReqCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <Package className="h-3 w-3" /> {partReqCount} parts pending
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: tabs + content */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex gap-1 border-b mb-5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {t.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tab === t.id ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Customer + Address */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-gray-400" />Customer</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Link href={`/customers/${wo.customer.id}`} className="font-medium hover:underline text-primary text-sm">
                      {wo.customer.firstName} {wo.customer.lastName ?? ""}
                    </Link>
                    {wo.customer.companyName && <p className="text-sm text-gray-500">{wo.customer.companyName}</p>}
                  </div>
                  {"phone" in wo.customer && wo.customer.phone && (
                    <a href={`tel:${wo.customer.phone}`} className="flex items-center gap-1.5 text-sm text-primary">
                      <Phone className="h-3.5 w-3.5" />{wo.customer.phone}
                    </a>
                  )}
                  {"email" in wo.customer && wo.customer.email && (
                    <a href={`mailto:${wo.customer.email}`} className="flex items-center gap-1.5 text-sm text-primary">
                      <Mail className="h-3.5 w-3.5" />{wo.customer.email}
                    </a>
                  )}
                  {wo.serviceAddress && (
                    <div className="flex items-start gap-2 pt-1 border-t">
                      <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                      <div className="text-sm text-gray-600">
                        <p>{wo.serviceAddress.line1}</p>
                        {"line2" in wo.serviceAddress && wo.serviceAddress.line2 && <p>{wo.serviceAddress.line2}</p>}
                        <p>{["city" in wo.serviceAddress ? wo.serviceAddress.city : "", "state" in wo.serviceAddress ? wo.serviceAddress.state : "", "zip" in wo.serviceAddress ? wo.serviceAddress.zip : ""].filter(Boolean).join(", ")}</p>
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent([wo.serviceAddress.line1, "city" in wo.serviceAddress ? wo.serviceAddress.city : ""].filter(Boolean).join(", "))}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary mt-1"
                        >
                          Open in Maps <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job details */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-gray-500">Type</p><p className="font-medium">{wo.type.replace(/_/g, " ")}</p></div>
                    <div><p className="text-gray-500">Scheduled</p><p className="font-medium">{fmtDateTime(wo.scheduledStart)}</p></div>
                    <div><p className="text-gray-500">Est. Duration</p><p className="font-medium">{fmtMins(wo.estimatedDuration)}</p></div>
                    <div><p className="text-gray-500">Created</p><p className="font-medium">{fmtDate(wo.createdAt)}</p></div>
                    {wo.completedAt && <div><p className="text-gray-500">Completed</p><p className="font-medium">{fmtDate(wo.completedAt)}</p></div>}
                    <div><p className="text-gray-500">Created By</p><p className="font-medium">{wo.createdBy.firstName} {wo.createdBy.lastName}</p></div>
                  </div>
                  {wo.description && (
                    <div className="border-t pt-3">
                      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{wo.description}</p>
                    </div>
                  )}
                  {wo.internalNotes && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs text-amber-700 font-medium mb-1">Internal Notes</p>
                      <p className="text-sm text-amber-800 whitespace-pre-wrap">{wo.internalNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipment */}
              {wo.asset && (
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-gray-400" />Equipment</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-gray-500">Make / Model</p><p className="font-medium">{[wo.asset.make, wo.asset.model].filter(Boolean).join(" ")}</p></div>
                      {wo.asset.serialNumber && <div><p className="text-gray-500">Serial #</p><p className="font-medium font-mono text-xs">{wo.asset.serialNumber}</p></div>}
                      {"type" in wo.asset && wo.asset.type && <div><p className="text-gray-500">Type</p><p className="font-medium">{String(wo.asset.type).replace(/_/g, " ")}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assigned techs */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Assigned Technicians</CardTitle></CardHeader>
                <CardContent>
                  {wo.assignments.filter(a => a.isActive).length === 0 ? (
                    <p className="text-sm text-gray-400">No technicians assigned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {wo.assignments.filter(a => a.isActive).map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: a.user.color ?? "#1B3A6B" }}>
                            {a.user.firstName[0]}{a.user.lastName[0]}
                          </div>
                          <span className="text-sm font-medium">{a.user.firstName} {a.user.lastName}</span>
                          {a.isLead && <Badge variant="secondary" className="text-xs">Lead</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick stats row */}
              {(photoCount > 0 || noteCount > 0 || partReqCount > 0 || checkTotal > 0) && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Photos", value: photoCount, icon: Camera, tab: "photos" as Tab },
                    { label: "Notes", value: noteCount, icon: MessageSquare, tab: "notes" as Tab },
                    { label: "Parts Pending", value: partReqCount, icon: Package, tab: "parts" as Tab },
                    { label: "Checklist", value: `${checkDone}/${checkTotal}`, icon: ClipboardCheck, tab: "checklist" as Tab },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      onClick={() => setTab(stat.tab)}
                      className="flex flex-col items-center p-3 border rounded-xl hover:bg-gray-50 transition-colors text-center"
                    >
                      <stat.icon className="h-5 w-5 text-gray-400 mb-1" />
                      <span className="text-lg font-bold">{stat.value}</span>
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "photos" && <PhotoGrid wo={wo} onRefresh={refresh} />}
          {tab === "notes" && <NotesPanel wo={wo} onRefresh={refresh} />}
          {tab === "parts" && <PartsPanel wo={wo} onRefresh={refresh} />}
          {tab === "checklist" && <ChecklistPanel wo={wo} onRefresh={refresh} />}
          {tab === "diagnostics" && <DiagnosticsPanel wo={wo} onRefresh={refresh} />}

          {/* Time tab */}
          {tab === "time" && (
            <div className="space-y-4">
              {wo.timeEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Timer className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No time logged yet</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    Total time on job: <span className="font-semibold">{fmtMins(totalMinutes)}</span>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-gray-500 text-xs uppercase tracking-wide">
                            <th className="px-4 py-2.5 text-left">Tech</th>
                            <th className="px-4 py-2.5 text-left">In</th>
                            <th className="px-4 py-2.5 text-left">Out</th>
                            <th className="px-4 py-2.5 text-right">Duration</th>
                            <th className="px-4 py-2.5 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wo.timeEntries.map((te) => (
                            <tr key={te.id} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium">{te.user.firstName} {te.user.lastName}</td>
                              <td className="px-4 py-2.5 text-gray-600">{fmtDateTime(te.clockInAt)}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {te.clockOutAt ? fmtDateTime(te.clockOutAt) : <Badge variant="warning" className="text-xs">Active</Badge>}
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium">{fmtMins(te.totalMinutes)}</td>
                              <td className="px-4 py-2.5">
                                <Badge variant={te.status === "APPROVED" ? "success" : te.status === "REJECTED" ? "destructive" : "secondary"} className="text-xs">
                                  {te.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === "history" && (
            <div className="space-y-3">
              {wo.statusHistory.length === 0 ? (
                <p className="text-sm text-gray-400">No status changes yet</p>
              ) : (
                wo.statusHistory.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <History className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="w-px flex-1 bg-gray-100 my-1" />
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 text-sm">
                        {h.fromStatus && <span className="text-gray-400">{h.fromStatus.replace(/_/g, " ")}</span>}
                        {h.fromStatus && <span className="text-gray-300">→</span>}
                        <span className="font-medium">{h.toStatus.replace(/_/g, " ")}</span>
                      </div>
                      {h.note && <p className="text-sm text-gray-500 mt-0.5 italic">{h.note}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(h.changedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Status update */}
          {allowed.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Update Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowed.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {nextStatus && (
                  <textarea
                    className="w-full border rounded px-2 py-1.5 text-sm resize-none"
                    rows={2}
                    placeholder="Note (optional)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                )}
                <Button
                  className="w-full text-sm"
                  size="sm"
                  disabled={!nextStatus || updateStatus.isPending}
                  onClick={() => updateStatus.mutate({ id: wo.id, status: nextStatus as never, note: statusNote || undefined })}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  {updateStatus.isPending ? "Updating..." : "Confirm"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setTab("photos")}>
                <Camera className="h-3.5 w-3.5 text-gray-400" /> Add Photos
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setTab("notes")}>
                <MessageSquare className="h-3.5 w-3.5 text-gray-400" /> Add Note
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setTab("parts")}>
                <Package className="h-3.5 w-3.5 text-gray-400" /> Request Part
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-sm" onClick={() => setTab("diagnostics")}>
                <Wrench className="h-3.5 w-3.5 text-gray-400" /> Diagnostics
              </Button>
            </CardContent>
          </Card>

          {/* Pending part requests alert */}
          {partReqCount > 0 && (
            <div
              className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 cursor-pointer"
              onClick={() => setTab("parts")}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {partReqCount} part{partReqCount !== 1 ? "s" : ""} requested — needs ordering
            </div>
          )}

          {wo.status === "CANCELLED" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This work order is cancelled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
