"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { ArrowLeft, Phone, Mail, MapPin, Wrench, ClipboardList, Plus } from "lucide-react";

const WO_STATUS_COLORS: Record<string, "destructive" | "warning" | "secondary" | "success" | "default"> = {
  NEW: "secondary", SCHEDULED: "secondary", DISPATCHED: "warning",
  EN_ROUTE: "warning", IN_PROGRESS: "success", ON_HOLD: "default",
  COMPLETE: "success", INVOICED: "default", PAID: "success", CANCELLED: "destructive",
};

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtPhone(p: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  return p;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = trpc.customers.getById.useQuery({ id });

  if (isLoading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-red-500">Customer not found.</p>
        <Link href="/customers"><Button variant="ghost" size="sm" className="mt-2"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Customers</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.firstName} {customer.lastName ?? ""}
            </h1>
            {customer.companyName && (
              <p className="text-sm text-gray-500 mt-0.5">{customer.companyName}</p>
            )}
          </div>
        </div>
        <Link href={`/work-orders/new?customerId=${customer.id}`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Work Order
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: contact + addresses */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  {fmtPhone(customer.phone)}
                </a>
              )}
              {customer.altPhone && (
                <a href={`tel:${customer.altPhone}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                  <Phone className="h-4 w-4 text-gray-300 shrink-0" />
                  {fmtPhone(customer.altPhone)} (alt)
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm hover:text-primary truncate">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  {customer.email}
                </a>
              )}
              {!customer.phone && !customer.email && (
                <p className="text-sm text-gray-400">No contact info</p>
              )}
              {customer.notes && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
              <div className="border-t pt-3 text-xs text-gray-400">
                Customer since {fmtDate(customer.createdAt)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Service Addresses</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-gray-400">No addresses on file</p>
              ) : customer.addresses.map((addr) => (
                <div key={addr.id} className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
                  <div>
                    <p>{addr.line1}</p>
                    {addr.line2 && <p className="text-gray-500">{addr.line2}</p>}
                    <p className="text-gray-500">
                      {[addr.city, addr.state, addr.zip].filter(Boolean).join(", ")}
                    </p>
                    {addr.isPrimary && <Badge variant="secondary" className="text-xs mt-1">Primary</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {customer.assets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Equipment ({customer.assets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.assets.map((asset) => (
                  <div key={asset.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                    <p className="font-medium">{[asset.make, asset.model].filter(Boolean).join(" ") || "Unknown"}</p>
                    {asset.serialNumber && <p className="text-gray-500 text-xs">S/N: {asset.serialNumber}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: work orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Work Orders ({customer.workOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {customer.workOrders.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No work orders yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">WO #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.workOrders.map((wo) => (
                      <TableRow key={wo.id}>
                        <TableCell>
                          <Link href={`/work-orders/${wo.id}`} className="font-mono font-medium text-sm hover:underline text-primary">
                            WO-{String(wo.number).padStart(4, "0")}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{wo.type.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge variant={WO_STATUS_COLORS[wo.status] ?? "default"} className="text-xs">
                            {wo.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{fmtDate(wo.scheduledStart)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
