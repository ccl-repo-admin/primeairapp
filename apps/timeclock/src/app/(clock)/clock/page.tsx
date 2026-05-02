"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useLocation } from "@/hooks/useLocation";
import { compressImage } from "@/lib/compress-image";
import { Loader2, MapPin, MapPinOff, Navigation, AlertTriangle, RefreshCw, ShieldAlert, Camera, X, ClipboardList, ChevronRight, CheckCircle2 } from "lucide-react";

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── PO / Job Picker ─────────────────────────────────────────────────────────

type POItem = {
  id: string;
  number: string;
  description: string | null;
  customer: { firstName: string; lastName: string | null; companyName: string | null } | null;
  dueAt: Date | null;
  amount: unknown;
};

function POPicker({
  pos,
  selected,
  onSelect,
}: {
  pos: POItem[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = pos.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.number.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q) ||
      (p.customer?.companyName ?? "").toLowerCase().includes(q) ||
      (`${p.customer?.firstName ?? ""} ${p.customer?.lastName ?? ""}`).toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-sm space-y-3">
      <div>
        <p className="font-semibold text-gray-800 text-base flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Select Your Job / PO
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Choose the work order you&apos;re clocking in for.</p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by PO #, customer, or description..."
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />

      {pos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No open jobs found. Contact your dispatcher.
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">No results for &ldquo;{search}&rdquo;</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filtered.map((po) => {
            const customerName = po.customer?.companyName
              ? po.customer.companyName
              : po.customer
              ? `${po.customer.firstName} ${po.customer.lastName ?? ""}`.trim()
              : null;
            const isSelected = selected === po.id;
            return (
              <button
                key={po.id}
                type="button"
                onClick={() => onSelect(po.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">PO #{po.number}</p>
                  {po.description && <p className="text-xs text-gray-500 truncate">{po.description}</p>}
                  {customerName && <p className="text-xs text-gray-400 truncate">{customerName}</p>}
                </div>
                {isSelected ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Manual location fallback ─────────────────────────────────────────────────

function ManualLocationForm({
  onSubmit,
  isPending,
  openPOs,
  selectedPoId,
  onPoSelect,
  requiresPO,
}: {
  onSubmit: (address: string, photoUrl?: string) => void;
  isPending: boolean;
  openPOs?: POItem[];
  selectedPoId: string | null;
  onPoSelect: (id: string) => void;
  requiresPO: boolean;
}) {
  const [address, setAddress] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("file", compressed);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url?: string };
      if (data.url) setPhotoUrl(data.url);
      else throw new Error("No URL");
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  }

  const canSubmit = address.trim() && (!requiresPO || !!selectedPoId);
  const selectedPO = openPOs?.find(p => p.id === selectedPoId);

  return (
    <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-5 space-y-4 text-left shadow-sm">
      <div>
        <p className="font-semibold text-gray-800 text-sm">Manual Location Check-In</p>
        <p className="text-xs text-gray-500 mt-0.5">Enter your address and optionally upload a photo of a nearby street sign or landmark.</p>
      </div>

      {/* PO selection inside manual form */}
      {openPOs !== undefined && (
        <div className="border-b pb-4">
          {selectedPO ? (
            <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5 border-2 border-primary rounded-xl">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Selected Job</p>
                <p className="font-semibold text-gray-900 text-sm">PO #{selectedPO.number}</p>
                {selectedPO.description && <p className="text-xs text-gray-500 truncate">{selectedPO.description}</p>}
              </div>
              <button type="button" onClick={() => onPoSelect("")}
                className="text-xs text-gray-400 underline underline-offset-2 shrink-0 ml-3">
                Change
              </button>
            </div>
          ) : (
            <POPicker pos={openPOs} selected={selectedPoId} onSelect={onPoSelect} />
          )}
          {requiresPO && !selectedPoId && (
            <p className="text-xs text-amber-600 mt-2">⚠ You must select a job before clocking in.</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Your current address or location</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, City, State"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Photo proof <span className="text-gray-400">(optional)</span></label>
        {mounted && <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />}
        {uploadError && <p className="text-xs text-amber-600">Photo upload unavailable — you can still clock in with your address only.</p>}
        {photoUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="Location proof" className="w-full h-32 object-cover rounded-xl" />
            <button
              type="button"
              onClick={() => { setPhotoUrl(undefined); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-gray-400 transition-colors"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Take Photo / Choose File"}
          </button>
        )}
      </div>

      <button
        onClick={() => { if (canSubmit) onSubmit(address.trim(), photoUrl); }}
        disabled={!canSubmit || isPending || uploading}
        className="w-full py-3 bg-primary text-white font-semibold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
      >
        {isPending ? "Clocking in..." : "Clock In with Manual Location"}
      </button>
    </div>
  );
}

// ─── Location gate UI ────────────────────────────────────────────────────────

function LocationGate({
  state,
  onRetry,
  showManual,
  onShowManual,
}: {
  state: ReturnType<typeof useLocation>["state"];
  onRetry: () => void;
  showManual: boolean;
  onShowManual: () => void;
}) {
  if (state.status === "requesting") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <Loader2 className="h-9 w-9 text-blue-500 animate-spin" />
        </div>
        <div>
          <p className="font-semibold text-gray-800">Getting your location</p>
          <p className="text-sm text-gray-500 mt-1">Allow precise location when prompted</p>
        </div>
      </div>
    );
  }

  if (state.status === "denied") {
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldAlert className="h-9 w-9 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">Location Access Denied</p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Precise location is required to clock in. You&apos;ve blocked location access for this app.
          </p>
        </div>
        <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">How to fix</p>
          <p className="text-sm text-red-700">
            <strong>iPhone:</strong> Settings → Privacy &amp; Security → Location Services → Safari (or your browser) → While Using App + Precise Location On
          </p>
          <p className="text-sm text-red-700">
            <strong>Android:</strong> Settings → Apps → Your Browser → Permissions → Location → Allow only while using app + Use precise location
          </p>
        </div>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors">
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
        {!showManual && (
          <button onClick={onShowManual} className="text-xs text-gray-400 underline underline-offset-2">
            Can&apos;t fix right now? Enter location manually
          </button>
        )}
      </div>
    );
  }

  if (state.status === "imprecise") {
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
          <AlertTriangle className="h-9 w-9 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">Location Not Precise Enough</p>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Your current accuracy is <strong>±{state.accuracy}m</strong>. Precise GPS (under 150m) is required to clock in.
          </p>
        </div>
        {isMobile ? (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">How to fix</p>
            <p className="text-sm text-amber-700">
              <strong>iPhone:</strong> Settings → Privacy &amp; Security → Location Services → your browser → enable <em>Precise Location</em>
            </p>
            <p className="text-sm text-amber-700">
              <strong>Android:</strong> Make sure &ldquo;Use precise location&rdquo; is on in app location permissions, and GPS is enabled in quick settings.
            </p>
            <p className="text-sm text-amber-700">Try stepping outside or moving to a spot with a clear view of the sky.</p>
          </div>
        ) : (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Desktop browser detected</p>
            <p className="text-sm text-amber-700">
              Desktop computers don&apos;t have GPS — your browser estimated your location using Wi-Fi or your IP address, which isn&apos;t accurate enough.
            </p>
            <p className="text-sm text-amber-700">
              <strong>To clock in, open this page on your phone.</strong>
            </p>
          </div>
        )}
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 border-2 border-amber-400 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Retry Location
        </button>
        {!showManual && (
          <button onClick={onShowManual} className="text-xs text-gray-400 underline underline-offset-2">
            Can&apos;t get GPS? Enter location manually
          </button>
        )}
      </div>
    );
  }

  if (state.status === "timeout") {
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center">
          <MapPinOff className="h-9 w-9 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">Location Timed Out</p>
          <p className="text-sm text-gray-500 mt-2">
            Couldn&apos;t get a GPS fix in time. Make sure GPS is on and try again outdoors.
          </p>
        </div>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 border-2 border-amber-400 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
        {!showManual && (
          <button onClick={onShowManual} className="text-xs text-gray-400 underline underline-offset-2">
            Still no GPS? Enter location manually
          </button>
        )}
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
          <MapPinOff className="h-9 w-9 text-gray-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-lg">Location Unavailable</p>
          <p className="text-sm text-gray-500 mt-2">
            This device doesn&apos;t support GPS or location services are disabled.
          </p>
        </div>
        <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
        {!showManual && (
          <button onClick={onShowManual} className="text-xs text-gray-400 underline underline-offset-2">
            Enter location manually instead
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClockPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { state, request, isReady, coords } = useLocation();
  const [showManual, setShowManual] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const { data: activeEntry, refetch } = trpc.timeclock.getActiveEntry.useQuery();
  const { data: modules } = trpc.timeclock.getCompanyModules.useQuery();
  const { data: openPOs } = trpc.timeclock.listOpenPOs.useQuery(undefined, {
    enabled: !!modules?.purchaseOrders,
  });

  const clockIn = trpc.timeclock.clockIn.useMutation({
    onSuccess: () => { void refetch(); router.push("/clock/active"); },
  });

  useEffect(() => {
    if (activeEntry) router.push("/clock/active");
  }, [activeEntry, router]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const jobType = session?.user?.jobType ?? "";
  const payType = session?.user?.payType ?? "";

  const isFieldWorker = jobType === "SERVICE_TECH" || jobType === "INSTALLER";
  const isHourly = payType === "HOURLY";
  const requiresPO = !!modules?.purchaseOrders && isFieldWorker && isHourly;
  const poReady = !requiresPO || !!selectedPoId;

  function handleClockIn() {
    if (!isReady || !coords) return;
    clockIn.mutate({
      lat: coords.lat,
      lng: coords.lng,
      purchaseOrderId: selectedPoId ?? undefined,
    });
  }

  function handleManualClockIn(address: string, photoUrl?: string) {
    clockIn.mutate({
      lat: null,
      lng: null,
      manualAddress: address,
      clockInPhotoUrl: photoUrl ?? null,
      purchaseOrderId: selectedPoId ?? undefined,
    });
  }

  const locationReady = state.status === "granted";
  const locationBlocking = state.status === "denied" || state.status === "imprecise" || state.status === "timeout" || state.status === "unavailable";

  const selectedPO = openPOs?.find((p) => p.id === selectedPoId);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* PO / Job picker — shown first when required */}
      {requiresPO && (
        <div className="mb-8 w-full max-w-sm text-left">
          {selectedPO ? (
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-2 border-primary rounded-xl">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Selected Job</p>
                <p className="font-semibold text-gray-900 text-sm">PO #{selectedPO.number}</p>
                {selectedPO.description && <p className="text-xs text-gray-500 truncate">{selectedPO.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => setSelectedPoId(null)}
                className="text-xs text-gray-400 underline underline-offset-2 shrink-0 ml-3"
              >
                Change
              </button>
            </div>
          ) : (
            <POPicker
              pos={openPOs ?? []}
              selected={selectedPoId}
              onSelect={setSelectedPoId}
            />
          )}
        </div>
      )}

      {/* Location gate — shown when not yet ready */}
      {!locationReady && !showManual && (
        <div className="mb-8 w-full max-w-sm">
          <LocationGate state={state} onRetry={request} showManual={showManual} onShowManual={() => setShowManual(true)} />
        </div>
      )}

      {/* Manual location form */}
      {showManual && !locationReady && (
        <div className="mb-8 w-full max-w-sm">
          <ManualLocationForm
            onSubmit={handleManualClockIn}
            isPending={clockIn.isPending}
            openPOs={modules?.purchaseOrders ? (openPOs ?? []) : undefined}
            selectedPoId={selectedPoId}
            onPoSelect={(id) => setSelectedPoId(id || null)}
            requiresPO={requiresPO}
          />
          <button onClick={() => setShowManual(false)} className="mt-3 text-xs text-gray-400 underline underline-offset-2">
            Try GPS again instead
          </button>
        </div>
      )}

      {/* Location confirmed banner */}
      {locationReady && (
        <div className="mb-8 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
          <Navigation className="h-4 w-4 text-green-500 shrink-0" />
          <span className="font-medium">Location confirmed</span>
          <span className="text-green-500 text-xs">±{(state as { accuracy: number }).accuracy}m</span>
        </div>
      )}

      {/* Clock In button */}
      {!showManual && (
        <button
          onClick={handleClockIn}
          disabled={!locationReady || !poReady || clockIn.isPending}
          className={`w-52 h-52 rounded-full text-white text-2xl font-bold shadow-2xl transition-all flex flex-col items-center justify-center gap-2
            ${locationReady
              ? "bg-primary hover:bg-primary/90 active:scale-95 shadow-primary/30"
              : "bg-gray-300 cursor-not-allowed shadow-none"
            }
            disabled:opacity-80`}
          aria-label="Clock In"
        >
          {clockIn.isPending ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin" />
              <span className="text-lg">Clocking in...</span>
            </>
          ) : locationBlocking ? (
            <>
              <MapPin className="h-10 w-10 opacity-50" />
              <span className="text-lg opacity-70">Clock In</span>
              <span className="text-xs opacity-60 font-normal">Location required</span>
            </>
          ) : state.status === "requesting" ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin opacity-50" />
              <span className="text-lg opacity-70">Clock In</span>
            </>
          ) : (
            <>
              <span className="text-5xl">⏱</span>
              <span>Clock In</span>
            </>
          )}
        </button>
      )}

      {/* Prompt to select PO first */}
      {requiresPO && !selectedPoId && (
        <p className="mt-4 text-xs text-gray-400">
          Select a job above to enable clock-in
        </p>
      )}

      {!locationReady && !showManual && state.status !== "requesting" && (
        <p className="mt-6 text-xs text-gray-400">
          Precise GPS location is required to clock in
        </p>
      )}
    </div>
  );
}
