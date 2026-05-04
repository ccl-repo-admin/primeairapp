"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { Upload, Download, CheckCircle, AlertCircle, ArrowLeft, Building2, Home, HelpCircle } from "lucide-react";

// ─── Column mappings ──────────────────────────────────────────────────────────

const COMMERCIAL_MAP: Record<string, string> = {
  "Job #": "number",
  "SP": "salesperson",
  "DESC.": "description",
  "JOB NAME": "customerName",
  "LOCATION": "address",
  "GC": "gcName",
  "BILLED": "billedPercent",
  "Pkg Price": "amount",
  "Amount Due": "amountDue",
  "Permit": "permitNumber",
  "Permit Jurisdiction": "permitJurisdiction",
  "Sign-on/Pulled": "permitStatus",
  "NOC?": "nocRequired",
  "Permit  Exp. Date": "permitExpDate",
  "Permit Exp. Date": "permitExpDate",
  "Install Date": "installDate",
  "Start Up": "startupDate",
  "Insp.  Status": "inspectionStatus",
  "Insp. Status": "inspectionStatus",
  "Extended warranty?": "extendedWarranty",
  "Notes": "notes",
  "NTO": "nto",
  "LDOJ": "lastDayOnJob",
  "FDOJ": "firstDayOnJob",
};

const RESIDENTIAL_MAP: Record<string, string> = {
  "Job #": "number",
  "By": "salesperson",
  "TYPE": "description",
  "JOB NAME": "customerName",
  "LOCATION": "address",
  "Package\nPrice": "amount",
  "Package Price": "amount",
  "Amount \nDue": "amountDue",
  "Amount Due": "amountDue",
  "Install Date": "installDate",
  "Registered": "registeredDate",
  "Extended Warranty?": "extendedWarranty",
  "Jurisdiction": "permitJurisdiction",
  "Permit #": "permitNumber",
  "Permit Expires": "permitExpDate",
  "Start Up": "startupDate",
  "Insp Sch": "inspectionScheduledDate",
  "Red Tag/Yellow Tag": "redYellowTag",
  "Inspection Status ": "inspectionStatus",
  "Inspection Status": "inspectionStatus",
  "Re-inspection": "reinspection",
  "RMA ": "rma",
  "RMA": "rma",
  "Notes": "notes",
};

// ─── Detection ────────────────────────────────────────────────────────────────

type JobType = "COMMERCIAL" | "RESIDENTIAL" | "UNKNOWN";

function detectType(headers: string[], firstNumber?: string): JobType {
  const normalized = headers.map((h) => h.trim());
  if (normalized.includes("GC") || normalized.includes("NOC?")) return "COMMERCIAL";
  if (normalized.some((h) => h === "RMA" || h === "RMA ") || normalized.includes("Registered")) return "RESIDENTIAL";
  if (firstNumber?.toUpperCase().startsWith("C")) return "COMMERCIAL";
  if (firstNumber?.toUpperCase().startsWith("R")) return "RESIDENTIAL";
  return "UNKNOWN";
}

// ─── Row types ────────────────────────────────────────────────────────────────

type MappedFields = {
  number?: string; jobType?: string; description?: string; customerName?: string;
  address?: string; salesperson?: string; gcName?: string; billedPercent?: string;
  amount?: string; amountDue?: string; dueAt?: string; permitNumber?: string;
  permitJurisdiction?: string; permitStatus?: string; permitExpDate?: string;
  nocRequired?: string; installDate?: string; startupDate?: string;
  inspectionStatus?: string; inspectionScheduledDate?: string; extendedWarranty?: string;
  registeredDate?: string; redYellowTag?: string; reinspection?: string;
  rma?: string; nto?: string; firstDayOnJob?: string; lastDayOnJob?: string; notes?: string;
};

type ParsedRow = MappedFields & { _rowIndex: number; _errors: string[]; };

// ─── Templates ────────────────────────────────────────────────────────────────

const COMMERCIAL_TEMPLATE = `Job #,SP,DESC.,JOB NAME,LOCATION,GC ,BILLED,Pkg Price,Amount Due,Permit,Permit Jurisdiction,Sign-on/Pulled,NOC?,Permit Exp. Date,Install Date,Start Up,Insp. Status,Extended warranty?,Notes,NTO,LDOJ,FDOJ
C1001,JC,Retro,Sample Customer - Building A,"123 Main St, Clearwater",Sample GC,50%,"$25,000.00","$12,500.00",22-001234,Clearwater,Pulled,Yes,12/31/25,06/01/25,07/01/25,Passed,No,Sample notes,n/a,,`;

const RESIDENTIAL_TEMPLATE = `Job #,By,TYPE,JOB NAME,LOCATION,"Package
Price","Amount
Due",Install Date,Registered,Extended Warranty?,Jurisdiction,Permit #,Permit Expires,Start Up,Insp Sch,Red Tag/Yellow Tag,Inspection Status ,Re-inspection,RMA ,Notes
R10001,PG,Retro,"Smith, John","5120 Oak Ave, Tampa","$7,500 "," $3,750.00",06/01/25,06/15/25,No,Tampa,25-100001,12/31/25,06/20/25,07/10/25,NA,Passed,NA,NA,Sample notes`;

export default function ImportPOsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [jobType, setJobType] = useState<JobType>("UNKNOWN");
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number; errors: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bulkImport = trpc.purchaseOrders.bulkImport.useMutation({
    onSuccess: (data) => setResult(data),
  });

  function mapRow(raw: Record<string, string>, map: Record<string, string>): MappedFields {
    const out: Record<string, string> = {};
    for (const [csvCol, field] of Object.entries(map)) {
      const val = raw[csvCol]?.trim() ?? "";
      if (val && !out[field]) out[field] = val;
    }
    return out as MappedFields;
  }

  function parseFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as Record<string, string>[];
        if (rawRows.length === 0) return;

        const headers = Object.keys(rawRows[0] ?? {});
        const firstNum = rawRows[0]?.["Job #"]?.trim();
        const detected = detectType(headers, firstNum);
        setJobType(detected);

        const colMap = detected === "COMMERCIAL" ? COMMERCIAL_MAP : detected === "RESIDENTIAL" ? RESIDENTIAL_MAP : {};

        const parsed: ParsedRow[] = rawRows.map((raw, i) => {
          const mapped = mapRow(raw, colMap);
          const errors: string[] = [];
          if (!mapped.number?.trim()) errors.push("Job # is required");
          return { ...mapped, _rowIndex: i + 2, _errors: errors };
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

  function downloadTemplate(type: "commercial" | "residential") {
    const content = type === "commercial" ? COMMERCIAL_TEMPLATE : RESIDENTIAL_TEMPLATE;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `primeair-${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidCount = rows.length - validRows.length;

  function handleImport() {
    if (validRows.length === 0) return;
    const type = jobType === "UNKNOWN" ? null : jobType;
    bulkImport.mutate(
      validRows.map((r) => ({
        number: r.number ?? "",
        jobType: type,
        description: r.description || null,
        customerName: r.customerName || null,
        address: r.address || null,
        salesperson: r.salesperson || null,
        gcName: r.gcName || null,
        billedPercent: r.billedPercent || null,
        amount: r.amount || null,
        amountDue: r.amountDue || null,
        dueAt: r.dueAt || null,
        permitNumber: r.permitNumber || null,
        permitJurisdiction: r.permitJurisdiction || null,
        permitStatus: r.permitStatus || null,
        permitExpDate: r.permitExpDate || null,
        nocRequired: r.nocRequired || null,
        installDate: r.installDate || null,
        startupDate: r.startupDate || null,
        inspectionStatus: r.inspectionStatus || null,
        inspectionScheduledDate: r.inspectionScheduledDate || null,
        extendedWarranty: r.extendedWarranty || null,
        registeredDate: r.registeredDate || null,
        redYellowTag: r.redYellowTag || null,
        reinspection: r.reinspection || null,
        rma: r.rma || null,
        nto: r.nto || null,
        firstDayOnJob: r.firstDayOnJob || null,
        lastDayOnJob: r.lastDayOnJob || null,
        notes: r.notes || null,
      }))
    );
  }

  const typeConfig = {
    COMMERCIAL: { label: "Commercial job list detected", icon: Building2, color: "bg-blue-50 border-blue-200 text-blue-800" },
    RESIDENTIAL: { label: "Residential job list detected", icon: Home, color: "bg-green-50 border-green-200 text-green-800" },
    UNKNOWN: { label: "Format unknown — verify your file matches a PrimeAir template", icon: HelpCircle, color: "bg-amber-50 border-amber-200 text-amber-800" },
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Import Job List</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload your Commercial or Residential CSV — the system detects the format automatically.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upload CSV</CardTitle>
              <CardDescription>
                Drop in your existing Commercial or Residential job list. Duplicate job numbers will be skipped.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("commercial")}>
                <Download className="h-4 w-4 mr-1.5" />
                Commercial Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("residential")}>
                <Download className="h-4 w-4 mr-1.5" />
                Residential Template
              </Button>
            </div>
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
            <p className="text-xs text-gray-400 mt-1">Max 500 rows · Commercial or Residential format</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && !result && (
        <>
          {/* Detection banner */}
          {(() => {
            const cfg = typeConfig[jobType];
            const Icon = cfg.icon;
            return (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.color}`}>
                <Icon className="h-5 w-5 shrink-0" />
                <p className="font-medium text-sm">{cfg.label}</p>
                <Badge variant="outline" className="ml-auto text-xs">
                  {rows.length} rows · {validRows.length} valid
                </Badge>
              </div>
            );
          })()}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    <span className="text-green-600 font-medium">{validRows.length} ready to import</span>
                    {invalidCount > 0 && <span className="text-red-500 font-medium ml-2">{invalidCount} with errors (will be skipped)</span>}
                  </CardDescription>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={validRows.length === 0 || bulkImport.isPending}
                >
                  {bulkImport.isPending ? "Importing..." : `Import ${validRows.length} Job${validRows.length !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-10">Row</TableHead>
                      <TableHead>Job #</TableHead>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Address</TableHead>
                      {jobType === "COMMERCIAL" && <TableHead>GC</TableHead>}
                      <TableHead>Pkg Price</TableHead>
                      <TableHead>Install Date</TableHead>
                      <TableHead>Permit #</TableHead>
                      <TableHead>Insp. Status</TableHead>
                      <TableHead className="w-10">OK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row._rowIndex} className={row._errors.length > 0 ? "bg-red-50" : ""}>
                        <TableCell className="text-gray-400 text-xs">{row._rowIndex}</TableCell>
                        <TableCell className="font-semibold whitespace-nowrap">
                          {row.number || <span className="text-red-400 italic">missing</span>}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-gray-700">{row.customerName || "—"}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-gray-600 text-xs">{row.address || "—"}</TableCell>
                        {jobType === "COMMERCIAL" && (
                          <TableCell className="text-gray-600 text-xs truncate max-w-[120px]">{row.gcName || "—"}</TableCell>
                        )}
                        <TableCell className="text-gray-600 whitespace-nowrap text-xs">
                          {row.amount ? row.amount : "—"}
                        </TableCell>
                        <TableCell className="text-gray-600 whitespace-nowrap text-xs">{row.installDate || "—"}</TableCell>
                        <TableCell className="text-gray-600 whitespace-nowrap text-xs">{row.permitNumber || "—"}</TableCell>
                        <TableCell className="text-gray-600 text-xs">{row.inspectionStatus || "—"}</TableCell>
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
              </div>
            </CardContent>
          </Card>
        </>
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
            <div className="flex gap-2">
              <Link href="/purchase-orders">
                <Button variant="outline" size="sm">View Job List</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setResult(null); setJobType("UNKNOWN"); }}>
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
