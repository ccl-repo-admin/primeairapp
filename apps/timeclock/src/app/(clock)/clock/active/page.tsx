"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button, Card, CardContent, Badge } from "@primeair/ui";
import { Coffee, LogOut } from "lucide-react";

function formatElapsed(clockInAt: Date) {
  const ms = Date.now() - new Date(clockInAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ActiveShiftPage() {
  const router = useRouter();
  const { data: entry, refetch } = trpc.timeclock.getActiveEntry.useQuery();
  const clockOut = trpc.timeclock.clockOut.useMutation({
    onSuccess: () => { router.push("/clock"); },
  });
  const startBreak = trpc.timeclock.startBreak.useMutation({ onSuccess: () => void refetch() });
  const endBreak = trpc.timeclock.endBreak.useMutation({ onSuccess: () => void refetch() });

  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!entry?.clockInAt) return;
    const interval = setInterval(() => setElapsed(formatElapsed(entry.clockInAt)), 1000);
    return () => clearInterval(interval);
  }, [entry?.clockInAt]);

  useEffect(() => {
    if (entry === null) router.push("/clock");
  }, [entry, router]);

  if (!entry) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-gray-500">Loading shift...</p>
      </div>
    );
  }

  const onBreak = entry.breaks && entry.breaks.length > 0 && !entry.breaks[0]?.endAt;
  const clockInTime = new Date(entry.clockInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-2">
        <Badge variant={onBreak ? "warning" : "success"} className="text-sm px-3 py-1">
          {onBreak ? "On Break" : "On Shift"}
        </Badge>
      </div>

      <div className="my-8">
        <div className="text-6xl font-mono font-bold text-gray-900 tabular-nums">{elapsed}</div>
        <p className="text-sm text-gray-500 mt-2">Clocked in at {clockInTime}</p>
        {entry.workOrder && (
          <p className="text-sm text-primary mt-1 font-medium">WO-{entry.workOrder.number}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {!onBreak ? (
          <Button
            variant="outline"
            size="xl"
            onClick={() => startBreak.mutate({ type: "MEAL" })}
            disabled={startBreak.isPending}
            className="w-full"
          >
            <Coffee className="h-5 w-5 mr-2" />
            Start Break
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="xl"
            onClick={() => endBreak.mutate()}
            disabled={endBreak.isPending}
            className="w-full"
          >
            End Break
          </Button>
        )}

        <Button
          size="xl"
          variant="destructive"
          onClick={() => clockOut.mutate({})}
          disabled={clockOut.isPending || !!onBreak}
          className="w-full"
        >
          <LogOut className="h-5 w-5 mr-2" />
          {clockOut.isPending ? "Clocking out..." : "Clock Out"}
        </Button>

        {onBreak && (
          <p className="text-xs text-muted-foreground">End your break before clocking out</p>
        )}
      </div>
    </div>
  );
}
