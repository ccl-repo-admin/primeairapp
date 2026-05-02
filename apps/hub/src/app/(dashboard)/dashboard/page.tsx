"use client";
import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@primeair/ui";
import { Users, Clock, ClipboardCheck, TrendingUp, LogOut } from "lucide-react";

function formatDuration(clockInAt: Date) {
  const ms = Date.now() - new Date(clockInAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const { today, startOfDay, endOfDay } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { today: now, startOfDay: start, endOfDay: new Date(start.getTime() + 86400000) };
  }, []);

  const utils = trpc.useUtils();
  const { data: clockedIn } = trpc.reports.clockedInNow.useQuery();

  const adminClockOut = trpc.timeclock.adminClockOut.useMutation({
    onSuccess: () => {
      utils.reports.clockedInNow.invalidate();
      utils.reports.laborSummary.invalidate();
    },
  });
  const { data: pendingEntries } = trpc.timeclock.listEntries.useQuery({
    startDate: startOfDay,
    endDate: endOfDay,
    status: "PENDING",
    limit: 100,
    offset: 0,
  });
  const { data: laborToday } = trpc.reports.laborSummary.useQuery({
    startDate: startOfDay,
    endDate: endOfDay,
  });

  const clockedInCount = clockedIn?.length ?? 0;
  const pendingCount = pendingEntries?.length ?? 0;
  const totalHoursToday = laborToday?.rows.reduce(
    (sum, r) => sum + (r.regularMinutes + r.overtimeMinutes) / 60,
    0
  ) ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Clocked In</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clockedInCount}</div>
            <p className="text-xs text-gray-500 mt-1">techs on shift now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Pending Timecards</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
            <p className="text-xs text-gray-500 mt-1">awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalHoursToday.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">approved hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Open Jobs</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">—</div>
            <p className="text-xs text-gray-500 mt-1">Phase 2</p>
          </CardContent>
        </Card>
      </div>

      {/* Live crew status */}
      <Card>
        <CardHeader>
          <CardTitle>Team on Shift</CardTitle>
        </CardHeader>
        <CardContent>
          {!clockedIn || clockedIn.length === 0 ? (
            <p className="text-sm text-gray-500">No one is currently clocked in.</p>
          ) : (
            <div className="space-y-2">
              {clockedIn.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: entry.user.color ?? "#1B3A6B" }}
                    >
                      {entry.user.firstName[0]}{entry.user.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {entry.user.firstName} {entry.user.lastName}
                      </p>
                      {entry.workOrder && (
                        <p className="text-xs text-gray-500">WO-{entry.workOrder.number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">
                      {formatDuration(entry.clockInAt)}
                    </Badge>
                    <button
                      onClick={() => {
                        if (confirm(`Clock out ${entry.user.firstName} ${entry.user.lastName} now?`)) {
                          adminClockOut.mutate({ timeEntryId: entry.id, reason: "Manual clock-out by admin" });
                        }
                      }}
                      disabled={adminClockOut.isPending}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors disabled:opacity-50"
                    >
                      <LogOut className="h-3 w-3" /> Clock Out
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
