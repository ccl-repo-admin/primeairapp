"use client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@primeair/ui";
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import type { BulkImportRow } from "@primeair/validators";

type ParsedRow = BulkImportRow & { _rowIndex: number; _errors: string[] };

const TEMPLATE_CSV = `firstName,lastName,email,phone,roleName,jobType,hourlyRate,title
Marcus,Thompson,marcus@company.com,5551110001,Technician,SERVICE_TECH,28.00,Lead Tech
Carlos,Rivera,,5551110002,Technician,INSTALLER,32.00,Installer
Amanda,Smith,amanda@company.com,,Dispatcher,OFFICE_STAFF,,Office Manager`;

export default function ImportPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bulkImport = trpc.users.bulkImport.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = (results.data as Record<string, string>[]).map((row, i) => {
          const errors: string[] = [];
          if (!row.firstName?.trim()) errors.push("firstName required");
          if (!row.lastName?.trim()) errors.push("lastName required");
          if (row.jobType && !["SERVICE_TECH", "INSTALLER", "OFFICE_STAFF"].includes(row.jobType)) {
            errors.push(`Invalid jobType: ${row.jobType}`);
          }
          return {
            firstName: row.firstName?.trim() ?? "",
            lastName: row.lastName?.trim() ?? "",
            email: row.email?.trim() || undefined,
            phone: row.phone?.replace(/\D/g, "") || undefined,
            roleName: row.roleName?.trim() || undefined,
            jobType: (row.jobType as BulkImportRow["jobType"]) || "SERVICE_TECH",
            hourlyRate: row.hourlyRate ? Number(row.hourlyRate) : undefined,
            title: row.title?.trim() || undefined,
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

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  async function handleImport() {
    if (validRows.length === 0) return;
    bulkImport.mutate(
      validRows.map(({ _rowIndex, _errors, ...r }) => r)
    );
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee-import-template.csv";
    a.click();
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Employees</h1>
        <p className="text-sm text-gray-500 mt-1">Upload a CSV to add team members in bulk</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>Columns: firstName, lastName, email, phone, roleName, jobType, hourlyRate, title</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1.5" />
              Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Drop CSV here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Max 500 rows. Use role display names (e.g. "Technician", "Dispatcher")</p>
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
                  {validRows.length} valid, {invalidCount} with errors
                </CardDescription>
              </div>
              <Button onClick={handleImport} disabled={validRows.length === 0 || bulkImport.isPending}>
                {bulkImport.isPending ? "Importing..." : `Import ${validRows.length} Employees`}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email / Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row._rowIndex} className={row._errors.length > 0 ? "bg-red-50" : ""}>
                    <TableCell className="text-gray-400">{row._rowIndex}</TableCell>
                    <TableCell className="font-medium">{row.firstName} {row.lastName}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {row.email && <p>{row.email}</p>}
                        {row.phone && <p className="text-gray-500">{row.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{row.roleName ?? "Technician"}</Badge></TableCell>
                    <TableCell><span className="text-xs">{row.jobType}</span></TableCell>
                    <TableCell>{row.hourlyRate ? `$${row.hourlyRate}/hr` : "—"}</TableCell>
                    <TableCell>
                      {row._errors.length === 0 ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div>
                          <AlertCircle className="h-4 w-4 text-red-500 mb-1" />
                          {row._errors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600">{e}</p>
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
              <h3 className="font-semibold">Import Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
                <p className="text-sm text-emerald-600">Created</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-sm text-amber-600">Skipped (duplicate)</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
