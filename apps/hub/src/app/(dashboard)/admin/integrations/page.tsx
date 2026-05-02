import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@primeair/ui";
import { Monitor, Cloud } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect Prime Air to your accounting and payroll tools</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-gray-500" />
              <div>
                <CardTitle className="text-base">QuickBooks Desktop</CardTitle>
                <CardDescription>Sync customers, invoices, and time entries</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Phase 4</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Requires a local sync agent installed on the same Windows machine as QuickBooks Desktop.
            Time entries can be exported as IIF files now via{" "}
            <a href="/reports/timecards" className="text-primary hover:underline">
              Reports → Timecard Export
            </a>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-gray-500" />
              <div>
                <CardTitle className="text-base">QuickBooks Online</CardTitle>
                <CardDescription>OAuth 2.0 — bidirectional customer + invoice sync</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Phase 4</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Full two-way sync of customers, invoices, and payroll time activities. Available in Phase 4.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-gray-500" />
              <div>
                <CardTitle className="text-base">Payroll (Gusto, ADP, Paychex)</CardTitle>
                <CardDescription>Export timecards in standard payroll formats</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Phase 4</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Export approved timecards as CSV now via Timecard Export. Direct API integrations coming in Phase 4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
