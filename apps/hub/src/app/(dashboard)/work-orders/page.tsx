"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { Plus, ClipboardList } from "lucide-react";

const STATUS_COLORS: Record<string, "default" | "warning" | "info" | "success" | "secondary"> = {
  NEW: "secondary",
  SCHEDULED: "info",
  DISPATCHED: "warning",
  EN_ROUTE: "warning",
  IN_PROGRESS: "success",
  ON_HOLD: "default",
  COMPLETE: "success",
  INVOICED: "info",
  PAID: "success",
  CANCELLED: "default",
};

const PRIORITY_COLORS: Record<string, "default" | "warning" | "info" | "success" | "secondary"> = {
  EMERGENCY: "default",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "info",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_INSTALLATION: "Install",
  REPAIR: "Repair",
  PREVENTIVE_MAINTENANCE: "PM",
  EMERGENCY: "Emergency",
  WARRANTY: "Warranty",
  INSPECTION: "Inspection",
  ESTIMATE_ONLY: "Estimate",
};

export default function WorkOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const activeStatuses = ["NEW", "SCHEDULED", "DISPATCHED", "EN_ROUTE", "IN_PROGRESS", "ON_HOLD"];
  const { data: workOrders, isLoading } = trpc.workOrders.list.useQuery({
    ...(statusFilter === "active"
      ? {}
      : statusFilter === "all"
      ? {}
      : { status: statusFilter as "NEW" | "SCHEDULED" | "DISPATCHED" | "EN_ROUTE" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE" | "INVOICED" | "PAID" | "CANCELLED" }),
    limit: 100,
  });

  const filteredOrders = workOrders?.filter((wo) => {
    if (statusFilter === "active") return activeStatuses.includes(wo.status);
    if (statusFilter === "all") return true;
    return wo.status === statusFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{filteredOrders?.length ?? 0} orders</p>
        </div>
        <Link href="/work-orders/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Work Order
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active (all open)</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
            <SelectItem value="INVOICED">Invoiced</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredOrders?.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No work orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((wo) => (
                  <TableRow key={wo.id}>
                    <TableCell>
                      <Link href={`/work-orders/${wo.id}`} className="font-mono font-medium text-[#1B3A6B] hover:underline">
                        WO-{String(wo.number).padStart(4, "0")}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">
                          {wo.customer.companyName ?? `${wo.customer.firstName} ${wo.customer.lastName ?? ""}`}
                        </p>
                        {wo.serviceAddress && (
                          <p className="text-gray-500 text-xs">{wo.serviceAddress.line1}, {wo.serviceAddress.city}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{TYPE_LABELS[wo.type] ?? wo.type}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[wo.status] ?? "default"}>
                        {wo.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_COLORS[wo.priority] ?? "default"}>
                        {wo.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {wo.scheduledStart
                        ? new Date(wo.scheduledStart).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })
                        : <span className="text-gray-400">Unscheduled</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {wo.assignments.slice(0, 3).map((a) => (
                          <div
                            key={a.user.id}
                            title={`${a.user.firstName} ${a.user.lastName}`}
                            className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: a.user.color ?? "#1B3A6B" }}
                          >
                            {a.user.firstName[0]}{a.user.lastName[0]}
                          </div>
                        ))}
                        {wo.assignments.length === 0 && (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </div>
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
