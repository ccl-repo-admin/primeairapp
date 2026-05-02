"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@primeair/ui";
import { Download } from "lucide-react";

function toDateString(d: Date) {
  return d.toISOString().split("T")[0] ?? "";
}

export default function TimecardExportPage() {
  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000);

  const [startDate, setStartDate] = useState(toDateString(twoWeeksAgo));
  const [endDate, setEndDate] = useState(toDateString(today));
  const [format, setFormat] = useState<"csv" | "qb_iif">("csv");
  const [runQuery, setRunQuery] = useState(false);

  const { data, isFetching } = trpc.reports.timecardExport.useQuery(
    { startDate: new Date(startDate), endDate: new Date(endDate), format, status: "APPROVED" },
    { enabled: runQuery }
  );

  function download() {
    if (!data) return;
    const ext = data.format === "qb_iif" ? "iif" : "csv";
    const mime = data.format === "qb_iif" ? "text/plain" : "text/csv";
    const blob = new Blob([data.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timecards-${startDate}-${endDate}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timecard Export</h1>
        <p className="text-sm text-gray-500 mt-1">Export approved timecards for payroll or QuickBooks</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Export Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "qb_iif")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">Generic CSV (for Gusto, ADP, Paychex)</SelectItem>
                <SelectItem value="qb_iif">QuickBooks IIF (Desktop import)</SelectItem>
              </SelectContent>
            </Select>
            {format === "qb_iif" && (
              <p className="text-xs text-muted-foreground">
                Import this file in QuickBooks Desktop: File → Utilities → Import → IIF Files
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setRunQuery(true)} disabled={isFetching}>
              {isFetching ? "Generating..." : "Generate Export"}
            </Button>
            {data && (
              <Button variant="outline" onClick={download}>
                <Download className="h-4 w-4 mr-1.5" />
                Download {data.format === "qb_iif" ? "IIF" : "CSV"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
          <CardContent>
            <pre className="bg-gray-50 rounded p-4 text-xs overflow-auto max-h-64 whitespace-pre">
              {data.content.slice(0, 2000)}{data.content.length > 2000 ? "\n..." : ""}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
