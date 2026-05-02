"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { ArrowLeft, Download, Tag } from "lucide-react";

function fmtHours(mins: number) {
  const h = mins / 60;
  return h.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const RANGES = [
  { label: "Last 7 days",  days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function getRange(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export default function CostCodeSummaryPage() {
  const [rangeDays, setRangeDays] = useState(30);
  const { start, end } = useMemo(() => getRange(rangeDays), [rangeDays]);

  const { data, isFetching } = trpc.reports.costCodeSummary.useQuery({
    startDate: start,
    endDate: end,
  });

  const rows = data?.rows ?? [];

  function handleDownload() {
    if (!rows.length) return;
    const header = "Cost Code,Description,Entries,Total Hours,Labor Cost\n";
    const lines = rows.map((r) =>
      [r.code, r.description ?? "", r.entryCount, fmtHours(r.totalMinutes), fmtMoney(r.laborCost)].join(",")
    );
    const blob = new Blob([header + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-code-summary-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalMins = rows.reduce((s, r) => s + r.totalMinutes, 0);
  const totalCost = rows.reduce((s, r) => s + r.laborCost, 0);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/reports">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Reports</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cost Code Summary</h1>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={rangeDays === r.days ? "default" : "outline"}
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        {rows.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isFetching
              ? "Loading..."
              : `${rows.length} cost codes — ${fmtHours(totalMins)}h total, ${fmtMoney(totalCost)} labor cost`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!isFetching && rows.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No cost code data for this period</p>
              <p className="text-gray-400 text-xs mt-1">Assign cost codes to time entries to see breakdown here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Labor Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium bg-gray-100 px-1.5 py-0.5 rounded">{row.code}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {row.description ?? <span className="text-gray-400">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.entryCount}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtHours(row.totalMinutes)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtMoney(row.laborCost)}</TableCell>
                  </TableRow>
                ))}
                {rows.length > 0 && (
                  <TableRow className="border-t-2 bg-gray-50 font-semibold">
                    <TableCell colSpan={3} className="text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm">{fmtHours(totalMins)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtMoney(totalCost)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
