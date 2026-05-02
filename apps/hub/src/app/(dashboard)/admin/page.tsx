"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@primeair/ui";
import Link from "next/link";
import { Shield, Link2, Tag, Users } from "lucide-react";
import { toDateInputValue, type PayPeriodType } from "@/lib/pay-period";

export default function AdminPage() {
  const { data: settings } = trpc.admin.getCompanySettings.useQuery();
  const updateSettings = trpc.admin.updateCompanySettings.useMutation();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [defaultBreak, setDefaultBreak] = useState(30);
  const [payPeriodType, setPayPeriodType] = useState<PayPeriodType>("BIWEEKLY");
  const [payPeriodAnchor, setPayPeriodAnchor] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setTimezone(settings.timezone);
      setGeofenceRadius(settings.geofenceRadiusFt);
      setDefaultBreak(settings.defaultBreakMinutes);
      setPayPeriodType((settings.payPeriodType ?? "BIWEEKLY") as PayPeriodType);
      setPayPeriodAnchor(
        settings.payPeriodAnchorDate ? toDateInputValue(new Date(settings.payPeriodAnchorDate)) : ""
      );
    }
  }, [settings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      name,
      timezone,
      geofenceRadiusFt: geofenceRadius,
      defaultBreakMinutes: defaultBreak,
      payPeriodType,
      payPeriodAnchorDate: payPeriodAnchor ? new Date(payPeriodAnchor) : null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
          <CardDescription>Basic company profile and operational defaults</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Chicago" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Geofence Radius (ft)</Label>
                <Input
                  type="number"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  min={50}
                  max={1000}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default Break (min)</Label>
                <Input
                  type="number"
                  value={defaultBreak}
                  onChange={(e) => setDefaultBreak(Number(e.target.value))}
                  min={0}
                  max={120}
                />
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Pay Period</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Pay Period Type</Label>
                  <Select value={payPeriodType} onValueChange={(v) => setPayPeriodType(v as PayPeriodType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Biweekly (every 2 weeks)</SelectItem>
                      <SelectItem value="SEMIMONTHLY">Semimonthly (1st–15th / 16th–EOM)</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(payPeriodType === "WEEKLY" || payPeriodType === "BIWEEKLY") && (
                  <div className="space-y-1.5">
                    <Label>Period Start Date</Label>
                    <Input
                      type="date"
                      value={payPeriodAnchor}
                      onChange={(e) => setPayPeriodAnchor(e.target.value)}
                    />
                    <p className="text-xs text-gray-400">
                      Any Monday that starts a pay period. Used to anchor the cycle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" disabled={updateSettings.isPending}>
              {saved ? "Saved!" : updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Link href="/admin/permissions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Permissions</CardTitle>
                  <CardDescription>View the role permission matrix</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/roles">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Roles</CardTitle>
                  <CardDescription>Create and manage custom permission roles</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/cost-codes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Cost Codes</CardTitle>
                  <CardDescription>Manage job-type codes for payroll export and job costing</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/integrations">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Integrations</CardTitle>
                  <CardDescription>QuickBooks, payroll, and third-party apps</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
