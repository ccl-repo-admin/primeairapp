"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { Plus, Upload, LogOut } from "lucide-react";

const roleColors: Record<string, "default" | "info" | "warning" | "success" | "secondary"> = {
  Owner: "default",
  "Office Admin": "info",
  Dispatcher: "secondary",
  "Crew Lead": "warning",
  Technician: "success",
};

const jobTypeLabel: Record<string, string> = {
  SERVICE_TECH: "Service Tech",
  INSTALLER: "Installer",
  OFFICE_STAFF: "Office Staff",
};

export default function TeamPage() {
  const { data: users, isLoading } = trpc.users.list.useQuery({ isActive: true });
  const { data: clockedIn, refetch: refetchClockedIn } = trpc.reports.clockedInNow.useQuery();
  const utils = trpc.useUtils();

  // Map userId → active timeEntryId
  const clockedInMap = new Map(clockedIn?.map((e) => [e.user.id, e.id]) ?? []);

  const adminClockOut = trpc.timeclock.adminClockOut.useMutation({
    onSuccess: () => {
      refetchClockedIn();
      utils.reports.clockedInNow.invalidate();
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">{users?.length ?? 0} active members</p>
        </div>
        <div className="flex gap-2">
          <Link href="/team/import">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-1.5" />
              Import CSV
            </Button>
          </Link>
          <Link href="/team/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Member
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading team...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/team/${user.id}`} className="hover:underline">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: user.color ?? "#1B3A6B" }}
                          >
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                            {user.title && <p className="text-xs text-gray-500">{user.title}</p>}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleColors[user.role.name] ?? "secondary"}>
                        {user.role.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{jobTypeLabel[user.jobType] ?? user.jobType}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.email && <p>{user.email}</p>}
                        {user.phone && <p className="text-gray-500">{user.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.hourlyRate ? (
                        <span className="text-sm">${Number(user.hourlyRate).toFixed(2)}/hr</span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {clockedInMap.has(user.id) ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Clocked In</Badge>
                          <button
                            onClick={() => {
                              const entryId = clockedInMap.get(user.id)!;
                              if (confirm(`Clock out ${user.firstName} ${user.lastName} now?`)) {
                                adminClockOut.mutate({ timeEntryId: entryId, reason: "Manual clock-out by admin" });
                              }
                            }}
                            disabled={adminClockOut.isPending}
                            title="Clock out employee"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-colors disabled:opacity-50"
                          >
                            <LogOut className="h-3 w-3" /> Clock Out
                          </button>
                        </div>
                      ) : (
                        <Badge variant="outline">Off</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
