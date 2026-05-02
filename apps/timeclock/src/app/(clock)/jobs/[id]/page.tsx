"use client";
import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button, Badge } from "@primeair/ui";
import { compressImage } from "@/lib/compress-image";
import {
  ArrowLeft, MapPin, Clock, Phone, Wrench, Camera,
  MessageSquare, Package, ClipboardCheck, Loader2,
  Plus, X, CheckCircle, AlertCircle, Image as ImageIcon,
} from "lucide-react";

const STATUS_COLORS: Record<string, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  SCHEDULED: "secondary", DISPATCHED: "warning", EN_ROUTE: "warning",
  IN_PROGRESS: "success", ON_HOLD: "default", COMPLETE: "success",
};

const TECH_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  SCHEDULED: [{ label: "On My Way", next: "EN_ROUTE", color: "bg-[#1B3A6B]" }],
  DISPATCHED: [{ label: "On My Way", next: "EN_ROUTE", color: "bg-[#1B3A6B]" }],
  EN_ROUTE: [{ label: "Arrived — Start Job", next: "IN_PROGRESS", color: "bg-green-600" }],
  IN_PROGRESS: [
    { label: "Mark Complete", next: "COMPLETE", color: "bg-green-600" },
    { label: "Put On Hold", next: "ON_HOLD", color: "bg-amber-500" },
  ],
  ON_HOLD: [{ label: "Resume Job", next: "IN_PROGRESS", color: "bg-[#1B3A6B]" }],
};

const PHOTO_TYPE_OPTIONS = [
  { value: "BEFORE", label: "Before" },
  { value: "AFTER", label: "After" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "DAMAGE", label: "Damage" },
  { value: "OTHER", label: "Other" },
];

function fmtTime(d: Date | string | null) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const [activeSection, setActiveSection] = useState<"info" | "photos" | "notes" | "parts" | "checklist">("info");

  // Photo state
  const [photoType, setPhotoType] = useState("BEFORE");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoErr, setPhotoErr] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Note state
  const [noteBody, setNoteBody] = useState("");

  // Part request state
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partUrgency, setPartUrgency] = useState("STANDARD");
  const [partNotes, setPartNotes] = useState("");

  const { data: wo, isLoading } = trpc.workOrders.getById.useQuery({ id });

  const updateStatus = trpc.workOrders.updateStatus.useMutation({
    onSuccess: () => {
      utils.workOrders.getById.invalidate({ id });
      utils.workOrders.myJobs.invalidate();
    },
  });

  const addPhoto = trpc.workOrders.addPhoto.useMutation({
    onSuccess: () => { setPhotoCaption(""); utils.workOrders.getById.invalidate({ id }); },
  });

  const deletePhoto = trpc.workOrders.deletePhoto.useMutation({
    onSuccess: () => utils.workOrders.getById.invalidate({ id }),
  });

  const addNote = trpc.workOrders.addNote.useMutation({
    onSuccess: () => { setNoteBody(""); utils.workOrders.getById.invalidate({ id }); },
  });

  const addPartRequest = trpc.workOrders.addPartRequest.useMutation({
    onSuccess: () => {
      setPartName(""); setPartNumber(""); setPartQty("1"); setPartNotes("");
      utils.workOrders.getById.invalidate({ id });
    },
  });

  const toggleItem = trpc.workOrders.toggleChecklistItem.useMutation({
    onSuccess: () => utils.workOrders.getById.invalidate({ id }),
  });

  async function handlePhotoCapture(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoUploading(true);
    setPhotoErr("");
    try {
      for (const raw of Array.from(files)) {
        const file = await compressImage(raw);
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) { setPhotoErr("Upload failed. Try again."); continue; }
        const { url } = await res.json();
        await addPhoto.mutateAsync({
          workOrderId: id,
          url,
          caption: photoCaption || undefined,
          photoType: photoType as never,
        });
      }
    } finally {
      setPhotoUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-4">
        <Link href="/jobs">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <p className="text-red-500 mt-2">Job not found.</p>
      </div>
    );
  }

  const transitions = TECH_TRANSITIONS[wo.status] ?? [];
  const photoCount = wo.photos?.length ?? 0;
  const noteCount = wo.notes?.length ?? 0;
  const pendingParts = wo.partRequests?.filter((r: { status: string }) => r.status === "REQUESTED" || r.status === "ORDERED").length ?? 0;
  const checkTotal = wo.checklists?.reduce((s, c) => s + c.items.length, 0) ?? 0;
  const checkDone = wo.checklists?.reduce((s, c) => s + c.items.filter(i => i.isComplete).length, 0) ?? 0;

  const sections: { id: typeof activeSection; label: string; badge?: string; icon: React.ElementType }[] = [
    { id: "info", label: "Info", icon: Wrench },
    { id: "photos", label: "Photos", badge: photoCount > 0 ? String(photoCount) : undefined, icon: Camera },
    { id: "notes", label: "Notes", badge: noteCount > 0 ? String(noteCount) : undefined, icon: MessageSquare },
    { id: "parts", label: "Parts", badge: pendingParts > 0 ? String(pendingParts) : undefined, icon: Package },
    { id: "checklist", label: "Tasks", badge: checkTotal > 0 ? `${checkDone}/${checkTotal}` : undefined, icon: ClipboardCheck },
  ];

  return (
    <div className="pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-10">
        <Link href="/jobs">
          <button className="p-1 rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">WO-{String(wo.number).padStart(4, "0")}</p>
          <p className="font-semibold truncate">{wo.customer.firstName} {wo.customer.lastName ?? ""}</p>
        </div>
        <Badge variant={STATUS_COLORS[wo.status] ?? "default"} className="shrink-0 text-xs">
          {wo.status.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* Action buttons */}
        {transitions.length > 0 && (
          <div className="space-y-2">
            {transitions.map((t) => (
              <button
                key={t.next}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: wo.id, status: t.next as never })}
                className={`w-full py-4 ${t.color} text-white font-bold text-lg rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50`}
              >
                {updateStatus.isPending ? "Updating..." : t.label}
              </button>
            ))}
          </div>
        )}

        {wo.status === "COMPLETE" && (
          <div className="w-full py-4 bg-green-50 text-green-700 font-bold text-center text-lg rounded-2xl border border-green-200 flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6" /> Job Complete
          </div>
        )}

        {/* On hold: show pending parts */}
        {wo.status === "ON_HOLD" && pendingParts > 0 && (
          <div
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 cursor-pointer"
            onClick={() => setActiveSection("parts")}
          >
            <Package className="h-4 w-4 shrink-0" />
            Waiting on {pendingParts} part{pendingParts !== 1 ? "s" : ""}
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-1 overflow-x-auto border-b">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === s.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500"
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
              {s.badge && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSection === s.id ? "bg-primary/10" : "bg-gray-100"}`}>
                  {s.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* INFO section */}
        {activeSection === "info" && (
          <div className="space-y-4">
            {/* Customer */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-gray-700">Customer</h2>
              <div>
                <p className="font-medium">{wo.customer.firstName} {wo.customer.lastName ?? ""}</p>
                {wo.customer.companyName && <p className="text-sm text-gray-500">{wo.customer.companyName}</p>}
              </div>
              {wo.customer.phone && (
                <a href={`tel:${wo.customer.phone}`} className="flex items-center gap-2 text-primary text-sm font-medium">
                  <Phone className="h-4 w-4" />{wo.customer.phone}
                </a>
              )}
            </div>

            {/* Address */}
            {wo.serviceAddress && (
              <div className="bg-white rounded-xl border p-4 space-y-2">
                <h2 className="font-semibold text-sm text-gray-700">Service Address</h2>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                  <div className="text-sm">
                    <p>{wo.serviceAddress.line1}</p>
                    {"line2" in wo.serviceAddress && wo.serviceAddress.line2 && <p>{wo.serviceAddress.line2}</p>}
                    <p className="text-gray-500">{["city" in wo.serviceAddress ? wo.serviceAddress.city : "", "state" in wo.serviceAddress ? wo.serviceAddress.state : ""].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent([wo.serviceAddress.line1, "city" in wo.serviceAddress ? wo.serviceAddress.city : ""].filter(Boolean).join(", "))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 border rounded-lg text-sm font-medium text-primary hover:bg-blue-50 transition-colors"
                >
                  Open in Maps
                </a>
              </div>
            )}

            {/* Job details */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h2 className="font-semibold text-sm text-gray-700">Job Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Type</p>
                  <p className="font-medium">{wo.type.replace(/_/g, " ")}</p>
                </div>
                {wo.scheduledStart && (
                  <div>
                    <p className="text-gray-400 text-xs">Scheduled</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />{fmtTime(wo.scheduledStart)}
                    </p>
                  </div>
                )}
                {wo.estimatedDuration && (
                  <div>
                    <p className="text-gray-400 text-xs">Est. Duration</p>
                    <p className="font-medium">{Math.floor(wo.estimatedDuration / 60)}h{wo.estimatedDuration % 60 > 0 ? ` ${wo.estimatedDuration % 60}m` : ""}</p>
                  </div>
                )}
              </div>
              {wo.description && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{wo.description}</p>
                </div>
              )}
              {/* Notes visible to field team */}
              {wo.notes?.filter(n => n.visibility === "FIELD" || n.visibility === "CUSTOMER").map(note => (
                <div key={note.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    {note.author.firstName} {note.author.lastName}
                  </p>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{note.body}</p>
                </div>
              ))}
            </div>

            {/* Equipment */}
            {wo.asset && (
              <div className="bg-white rounded-xl border p-4 space-y-2">
                <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />Equipment
                </h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Make / Model</p>
                    <p className="font-medium">{[wo.asset.make, wo.asset.model].filter(Boolean).join(" ") || "—"}</p>
                  </div>
                  {wo.asset.serialNumber && (
                    <div>
                      <p className="text-gray-400 text-xs">Serial #</p>
                      <p className="font-medium font-mono text-xs">{wo.asset.serialNumber}</p>
                    </div>
                  )}
                  {"type" in wo.asset && wo.asset.type && (
                    <div>
                      <p className="text-gray-400 text-xs">Type</p>
                      <p className="font-medium">{String(wo.asset.type).replace(/_/g, " ")}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHOTOS section */}
        {activeSection === "photos" && (
          <div className="space-y-4">
            {/* Upload controls */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Add Photos</p>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {PHOTO_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="flex items-center justify-center gap-2 py-3 bg-[#1B3A6B] text-white rounded-xl font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-5 w-5" />}
                  {photoUploading ? "Uploading..." : "Take Photo"}
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file"; input.accept = "image/*"; input.multiple = true;
                    input.onchange = (e) => void handlePhotoCapture((e.target as HTMLInputElement).files);
                    input.click();
                  }}
                  disabled={photoUploading}
                  className="flex items-center justify-center gap-2 py-3 border-2 border-[#1B3A6B] text-[#1B3A6B] rounded-xl font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  <ImageIcon className="h-5 w-5" /> Choose File
                </button>
              </div>
              {/* Hidden input with camera capture for mobile */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handlePhotoCapture(e.target.files)}
              />
              {photoErr && <p className="text-xs text-red-500">{photoErr}</p>}
            </div>

            {/* Photo grid */}
            {(wo.photos?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No photos yet</p>
                <p className="text-gray-300 text-xs mt-1">Take before/after photos of the work</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {wo.photos?.map(photo => (
                  <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-square border bg-gray-50">
                    <img
                      src={photo.url}
                      alt={photo.caption ?? "Photo"}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setLightbox(photo.url)}
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {photo.photoType}
                      </span>
                    </div>
                    <button
                      className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white"
                      onClick={() => deletePhoto.mutate({ photoId: photo.id })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {photo.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-2">
                        <p className="text-white text-xs truncate">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Lightbox */}
            {lightbox && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setLightbox(null)}
              >
                <img src={lightbox} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )}
          </div>
        )}

        {/* NOTES section */}
        {activeSection === "notes" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Add Field Note</p>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={4}
                placeholder="Document what you found, what was done, or any follow-up needed..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
              />
              <button
                disabled={!noteBody.trim() || addNote.isPending}
                onClick={() => addNote.mutate({ workOrderId: wo.id, body: noteBody, visibility: "FIELD" })}
                className="w-full py-3 bg-[#1B3A6B] text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                {addNote.isPending ? "Saving..." : "Save Note"}
              </button>
            </div>

            {(wo.notes?.length ?? 0) === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wo.notes?.map(note => (
                  <div key={note.id} className="bg-white rounded-xl border p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: note.author.color ?? "#1B3A6B" }}
                      >
                        {note.author.firstName[0]}{note.author.lastName[0]}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{note.author.firstName} {note.author.lastName}</span>
                      <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PARTS section */}
        {activeSection === "parts" && (
          <div className="space-y-4">
            {/* Request form */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Request a Part</p>
              <input
                type="text"
                placeholder="Part name *"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Part # (optional)"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={partQty}
                  onChange={(e) => setPartQty(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <textarea
                placeholder="Additional notes (optional)"
                value={partNotes}
                onChange={(e) => setPartNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  disabled={!partName.trim() || addPartRequest.isPending}
                  onClick={() =>
                    addPartRequest.mutate({
                      workOrderId: wo.id,
                      name: partName,
                      partNumber: partNumber || undefined,
                      quantity: parseInt(partQty) || 1,
                      urgency: "STANDARD",
                      notes: partNotes || undefined,
                    })
                  }
                  className="flex-1 py-3 bg-[#1B3A6B] text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addPartRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {addPartRequest.isPending ? "Requesting..." : "Request Part"}
                </button>
                <button
                  disabled={!partName.trim() || addPartRequest.isPending}
                  onClick={() =>
                    addPartRequest.mutate({
                      workOrderId: wo.id,
                      name: partName,
                      partNumber: partNumber || undefined,
                      quantity: parseInt(partQty) || 1,
                      urgency: "URGENT",
                      notes: partNotes || undefined,
                    })
                  }
                  className="py-3 px-4 bg-amber-500 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <AlertCircle className="h-4 w-4" /> Urgent
                </button>
              </div>
            </div>

            {/* Part requests list */}
            {(wo.partRequests?.length ?? 0) === 0 ? (
              <div className="text-center py-8">
                <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No parts requested</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wo.partRequests?.map(req => {
                  const statusColor = {
                    REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
                    ORDERED: "border-blue-200 bg-blue-50 text-blue-700",
                    RECEIVED: "border-green-200 bg-green-50 text-green-700",
                    CANCELLED: "border-gray-200 bg-gray-50 text-gray-400",
                  }[req.status] ?? "";
                  return (
                    <div key={req.id} className={`rounded-xl border p-3 ${statusColor}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{req.name}</span>
                            {req.partNumber && <span className="text-xs opacity-70">#{req.partNumber}</span>}
                            <span className="text-xs opacity-70">× {req.quantity}</span>
                            {req.urgency === "URGENT" && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">URGENT</span>
                            )}
                          </div>
                          {req.notes && <p className="text-xs opacity-80 mt-0.5">{req.notes}</p>}
                        </div>
                        <span className="text-xs font-semibold shrink-0 capitalize">{req.status.toLowerCase()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CHECKLIST section */}
        {activeSection === "checklist" && (
          <div className="space-y-4">
            {(wo.checklists?.length ?? 0) === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No checklists yet</p>
                <p className="text-gray-300 text-xs mt-1">Your dispatcher will add checklists when needed</p>
              </div>
            ) : (
              wo.checklists?.map(checklist => {
                const done = checklist.items.filter(i => i.isComplete).length;
                return (
                  <div key={checklist.id} className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <p className="font-semibold text-sm">{checklist.name}</p>
                      <span className="text-xs text-gray-500">{done}/{checklist.items.length}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-gray-100">
                      <div
                        className="h-1 bg-green-500 transition-all"
                        style={{ width: checklist.items.length > 0 ? `${(done / checklist.items.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <div className="divide-y">
                      {checklist.items.map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50 ${item.isComplete ? "bg-green-50/50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.isComplete}
                            onChange={(e) => toggleItem.mutate({ itemId: item.id, isComplete: e.target.checked })}
                            className="h-5 w-5 rounded border-gray-300 text-green-600 cursor-pointer"
                          />
                          <span className={`text-sm flex-1 ${item.isComplete ? "line-through text-gray-400" : "text-gray-700"}`}>
                            {item.text}
                          </span>
                          {item.isComplete && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
