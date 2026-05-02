"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Badge } from "@primeair/ui";
import { MapPin, Clock, Briefcase } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  NEW_INSTALLATION: "New Install",
  REPAIR: "Repair",
  PREVENTIVE_MAINTENANCE: "PM",
  EMERGENCY: "Emergency",
  WARRANTY: "Warranty",
  INSPECTION: "Inspection",
  ESTIMATE_ONLY: "Estimate",
};

const STATUS_COLORS: Record<string, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  SCHEDULED: "secondary",
  DISPATCHED: "warning",
  EN_ROUTE: "warning",
  IN_PROGRESS: "success",
  ON_HOLD: "default",
};

export default function JobsPage() {
  const { data: jobs, isLoading } = trpc.workOrders.myJobs.useQuery({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
        <Briefcase className="h-12 w-12 text-gray-300 mb-4" />
        <p className="font-medium text-gray-600">No jobs scheduled today</p>
        <p className="text-sm text-gray-400 mt-1">Check back later or contact dispatch</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 pb-20">
      <h1 className="text-lg font-bold text-gray-900">Today&apos;s Jobs</h1>

      {jobs.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`}>
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-2 active:scale-[0.99] transition-transform">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-gray-900">WO-{String(job.number).padStart(4, "0")}</p>
                <p className="text-sm font-medium text-gray-700 mt-0.5">
                  {job.customer.firstName} {job.customer.lastName ?? ""}
                  {job.customer.companyName && (
                    <span className="text-gray-400 font-normal"> · {job.customer.companyName}</span>
                  )}
                </p>
              </div>
              <Badge variant={STATUS_COLORS[job.status] ?? "default"} className="shrink-0 text-xs">
                {job.status.replace("_", " ")}
              </Badge>
            </div>

            {job.serviceAddress && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {job.serviceAddress.line1}{job.serviceAddress.city ? `, ${job.serviceAddress.city}` : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="bg-gray-100 px-2 py-0.5 rounded">{TYPE_LABELS[job.type] ?? job.type}</span>
              {job.scheduledStart && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(job.scheduledStart).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              )}
              {job.estimatedDuration && (
                <span>{Math.round(job.estimatedDuration / 60 * 10) / 10}h est.</span>
              )}
            </div>

            {job.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{job.description}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
