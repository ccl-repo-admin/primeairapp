"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@primeair/ui";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function toDateString(d: Date) {
  return d.toISOString().split("T")[0] ?? "";
}

export default function LaborReportPage() {
  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000);

  const [startDate, setStartDate] = useState(toDateString(twoWeeksAgo));
  const [endDate, setEndDate] = useState(toDateString(today));
  const [runQuery, setRunQuery] = useState(false);

  const { data, isFetching } = trpc.reports.laborSummary.useQuery(
    { startDate: new Date(startDate), endDate: new Date(endDate) },
    { enabled: runQuery }
  );

  function downloadCsv() {
    if (!data) return;
    const header = "Name,Regular Hours,OT Hours,DT Hours,Total Pay\n";
    const rows = data.rows.map((r) =>
      `${r.name},${(r.regularMinutes / 60).toFixed(2)},${(r.overtimeMinutes / 60).toFixed(2)},${(r.doubleTimeMinutes / 60).toFixed(2)},${r.totalPay.toFixed(2)}`
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `labor-summary-${startDate}-${endDate}.csv`;
    a.click();
  }

  const chartData = data?.rows.map((r) => ({
    name: r.name.split(" ")[0] ?? r.name,
    regular: Number((r.regularMinutes / 60).toFixed(1)),
    overtime: Number((r.overtimeMinutes / 60).toFixed(1)),
  })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Labor Summary</h1>
        <p className="text-sm text-gray-500 mt-1">Approved hours and pay by technician</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => setRunQuery(true)} disabled={isFetching}>
              {isFetching ? "Loading..." : "Run Report"}
            </Button>
            {data && (
              <Button variant="outline" onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {chartData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Hours by Technician</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="regular" fill="#1B3A6B" name="Regular" />
                    <Bar dataKey="overtime" fill="#0891B2" name="Overtime" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detail — {data.rows.length} technicians, {data.totalEntries} entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technician</TableHead>
                    <TableHead className="text-right">Regular</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Double Time</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{(row.regularMinutes / 60).toFixed(2)}h</TableCell>
                      <TableCell className="text-right">
                        {row.overtimeMinutes > 0 ? (
                          <Badge variant="warning">{(row.overtimeMinutes / 60).toFixed(2)}h</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.doubleTimeMinutes > 0 ? (
                          <Badge variant="destructive">{(row.doubleTimeMinutes / 60).toFixed(2)}h</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">${row.hourlyRate.toFixed(2)}/hr</TableCell>
                      <TableCell className="text-right font-semibold">${row.totalPay.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {(data.rows.reduce((s, r) => s + r.regularMinutes, 0) / 60).toFixed(2)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {(data.rows.reduce((s, r) => s + r.overtimeMinutes, 0) / 60).toFixed(2)}h
                    </TableCell>
                    <TableCell className="text-right">
                      {(data.rows.reduce((s, r) => s + r.doubleTimeMinutes, 0) / 60).toFixed(2)}h
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right">
                      ${data.rows.reduce((s, r) => s + r.totalPay, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
