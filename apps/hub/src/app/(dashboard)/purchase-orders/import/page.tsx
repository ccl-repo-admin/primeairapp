"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { Upload, Download, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

const TEMPLATE_CSV = `number,description,customerName,dueAt,amount,notes
PO-2024-001,HVAC Installation Building A,Acme Corp,2024-12-31,5000.00,New 5-ton unit
PO-2024-002,Quarterly Maintenance - Smith,Smith Residence,2024-03-31,1200.00,
PO-2024-003,Emergency Repair - Downtown Office,,2024-06-15,850.00,After-hours call`;

type ParsedRow = {
  number: string;
  description: string;
  customerName: string;
  dueAt: string;
  amount: string;
  notes: string;
  _rowIndex: number;
  _errors: string[];
};

export default function ImportPOsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bulkImport = trpc.purchaseOrders.bulkImport.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Record<string, string>[]).map((row, i) => {
          const errors: string[] = [];
          if (!row.number?.trim()) errors.push("number is required");
          if (row.amount && isNaN(Number(row.amount))) errors.push(`amount must be a number (got "${row.amount}")`);
          if (row.dueAt && isNaN(new Date(row.dueAt).getTime())) errors.push(`dueAt must be a valid date (got "${row.dueAt}")`);
          return {
            number: row.number?.trim() ?? "",
            description: row.description?.trim() ?? "",
            customerName: row.customerName?.trim() ?? "",
            dueAt: row.dueAt?.trim() ?? "",
            amount: row.amount?.trim() ?? "",
            notes: row.notes?.trim() ?? "",
            _rowIndex: i + 2,
            _errors: errors,
          };
        });
        setRows(parsed);
        setResult(null);
      },
    });
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) return;
    parseFile(file);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "po-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  function handleImport() {
    if (validRows.length === 0) return;
    bulkImport.mutate(
      validRows.map((r) => ({
        number: r.number,
        description: r.description || null,
        customerName: r.customerName || null,
        dueAt: r.dueAt || null,
        amount: r.amount ? Number(r.amount) : null,
        notes: r.notes || null,
      }))
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload a CSV to add POs in bulk. Existing PO numbers will be skipped.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Required column: <code className="bg-gray-100 px-1 rounded text-xs">number</code> — Optional: description, customerName, dueAt (YYYY-MM-DD), amount, notes
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Drop your CSV here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Max 500 rows</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview — {rows.length} rows</CardTitle>
                <CardDescription>
                  <span className="text-green-600 font-medium">{validRows.length} valid</span>
                  {invalidCount > 0 && <span className="text-red-500 font-medium ml-2">{invalidCount} with errors</span>}
                </CardDescription>
              </div>
              <Button
                onClick={handleImport}
                disabled={validRows.length === 0 || bulkImport.isPending}
              >
                {bulkImport.isPending ? "Importing..." : `Import ${validRows.length} PO${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-10">Row</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-10">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row._rowIndex} className={row._errors.length > 0 ? "bg-red-50" : ""}>
                    <TableCell className="text-gray-400 text-xs">{row._rowIndex}</TableCell>
                    <TableCell className="font-semibold">{row.number || <span className="text-red-400 italic">missing</span>}</TableCell>
                    <TableCell className="max-w-xs truncate text-gray-600">{row.description || "—"}</TableCell>
                    <TableCell className="text-gray-600">{row.customerName || "—"}</TableCell>
                    <TableCell className="text-gray-600 whitespace-nowrap">{row.dueAt || "—"}</TableCell>
                    <TableCell className="text-gray-600">
                      {row.amount ? `$${Number(row.amount).toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell>
                      {row._errors.length === 0 ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div>
                          <AlertCircle className="h-4 w-4 text-red-500 mb-1" />
                          {row._errors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600 whitespace-nowrap">{e}</p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">Import Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-3xl font-bold text-emerald-700">{result.created}</p>
                <p className="text-sm text-emerald-600 mt-0.5">Created</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <p className="text-3xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-sm text-amber-600 mt-0.5">Skipped (duplicate)</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-3xl font-bold text-red-700">{result.failed}</p>
                <p className="text-sm text-red-600 mt-0.5">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1 mb-4">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <Link href="/purchase-orders">
              <Button variant="outline" size="sm">View Purchase Orders</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
