"use client";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@primeair/ui";
import { Download, DollarSign } from "lucide-react";

function getPayPeriods() {
  const periods = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const end = new Date(now);
    end.setDate(end.getDate() - i * 14);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    periods.push({
      label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      start,
      end,
    });
  }
  return periods;
}

const FORMATS = [
  { value: "csv", label: "Generic CSV" },
  { value: "gusto", label: "Gusto" },
  { value: "adp", label: "ADP WorkforceNow" },
] as const;

export default function PayrollExportPage() {
  const periods = useMemo(() => getPayPeriods(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(0);
  const [format, setFormat] = useState<"csv" | "gusto" | "adp">("csv");
  const [queried, setQueried] = useState(false);

  const period = periods[selectedPeriod]!;

  const { data, isFetching, refetch } = trpc.reports.payrollExport.useQuery(
    { startDate: period.start, endDate: period.end, format },
    { enabled: queried }
  );

  function handleRun() {
    setQueried(true);
    refetch();
  }

  function handleDownload() {
    if (!data) return;
    const ext = format === "adp" ? "csv" : "csv";
    const blob = new Blob([data.content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${format}-${data.period.replace(/\//g, "-").replace(/ /g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalRows = data?.content.split("\n").length ?? 0;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll Export</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export approved time entries in your payroll processor&apos;s format.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Export Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pay Period</Label>
              <Select value={String(selectedPeriod)} onValueChange={(v) => { setSelectedPeriod(Number(v)); setQueried(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => { setFormat(v as typeof format); setQueried(false); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            {format === "gusto" && "Exports employee hours ready to import in Gusto's Time & Attendance import flow."}
            {format === "adp" && "Exports in ADP WorkforceNow batch format. Map employee IDs before importing."}
            {format === "csv" && "Generic CSV with regular, OT, and DT hours + gross pay estimates. Works with any payroll processor."}
          </div>

          <Button onClick={handleRun} disabled={isFetching} className="w-full">
            {isFetching ? "Generating..." : "Generate Payroll Export"}
          </Button>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {data.period} — {totalRows - 1} employee{totalRows - 1 !== 1 ? "s" : ""}
            </CardTitle>
            <Button size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            {totalRows <= 1 ? (
              <div className="flex items-center gap-3 py-6 text-gray-500">
                <DollarSign className="h-8 w-8 text-gray-300" />
                <div>
                  <p className="font-medium">No approved time entries</p>
                  <p className="text-sm">Approve timecards first, then re-run the export.</p>
                </div>
              </div>
            ) : (
              <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-80 border font-mono">
                {data.content}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
