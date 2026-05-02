"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useLocation } from "@/hooks/useLocation";
import { Loader2, MapPin, MapPinOff, Navigation, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Location gate UI ────────────────────────────────────────────────────────

function LocationGate({
  state,
  onRetry,
}: {
  state: ReturnType<typeof useLocation>["state"];
  onRetry: () => void;
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
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
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
            <p className="text-sm text-amber-700">
              Try stepping outside or moving to a spot with a clear view of the sky.
            </p>
          </div>
        ) : (
          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Desktop browser detected</p>
            <p className="text-sm text-amber-700">
              Desktop computers don&apos;t have GPS — your browser estimated your location using Wi-Fi or your IP address, which isn&apos;t accurate enough.
            </p>
            <p className="text-sm text-amber-700">
              <strong>To clock in, open this page on your phone.</strong> Make sure your phone&apos;s GPS is enabled and grant this site precise location access when prompted by your browser.
            </p>
          </div>
        )}
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 border-2 border-amber-400 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Retry Location
        </button>
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
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 border-2 border-amber-400 rounded-xl text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
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
            This device doesn&apos;t support GPS or location services are disabled. Please enable GPS and try again.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
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

  const { data: activeEntry, refetch } = trpc.timeclock.getActiveEntry.useQuery();
  const clockIn = trpc.timeclock.clockIn.useMutation({
    onSuccess: () => { void refetch(); router.push("/clock/active"); },
  });

  useEffect(() => {
    if (activeEntry) router.push("/clock/active");
  }, [activeEntry, router]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  function handleClockIn() {
    if (!isReady || !coords) return;
    clockIn.mutate({ lat: coords.lat, lng: coords.lng });
  }

  const locationReady = state.status === "granted";
  const locationBlocking = state.status === "denied" || state.status === "imprecise" || state.status === "timeout" || state.status === "unavailable";

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

      {/* Location gate — shown when not yet ready */}
      {!locationReady && (
        <div className="mb-8 w-full max-w-sm">
          <LocationGate state={state} onRetry={request} />
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

      {/* Clock In button — disabled until location is locked in */}
      <button
        onClick={handleClockIn}
        disabled={!locationReady || clockIn.isPending}
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

      {/* Not clocked in label */}
      {!locationReady && state.status !== "requesting" && (
        <p className="mt-6 text-xs text-gray-400">
          Precise GPS location is required to clock in
        </p>
      )}
    </div>
  );
}
