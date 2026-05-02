"use client";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@primeair/ui";

function formatMinutes(m: number | null) {
  if (!m) return "—";
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const statusVariant: Record<string, "success" | "warning" | "outline" | "destructive"> = {
  APPROVED: "success",
  PENDING: "warning",
  ACTIVE: "info" as never,
  REJECTED: "destructive",
};

export default function TimecardsPage() {
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 28 * 86400000);
    return { startDate: start, endDate: end };
  }, []);

  const { data: entries, isLoading } = trpc.timeclock.myEntries.useQuery({
    startDate,
    endDate,
  });

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Timecards</h1>

      {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}

      {!isLoading && (!entries || entries.length === 0) && (
        <p className="text-gray-500 text-sm">No timecards in the last 28 days.</p>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">
                {new Date(entry.clockInAt).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
              </span>
              <Badge variant={statusVariant[entry.status] ?? "outline"}>
                {entry.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>In: {new Date(entry.clockInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              {entry.clockOutAt && (
                <span>Out: {new Date(entry.clockOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
              <span className="font-medium text-gray-700">{formatMinutes(entry.totalMinutes)}</span>
            </div>
            {entry.workOrder && (
              <p className="text-xs text-primary mt-1">WO-{entry.workOrder.number}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
