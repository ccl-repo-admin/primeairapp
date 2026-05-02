"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle, Input, Label,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";

export default function CostCodesPage() {
  const utils = trpc.useUtils();
  const { data: codes, isLoading } = trpc.costCodes.list.useQuery({});

  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState({ code: "", description: "" });
  const [editValues, setEditValues] = useState({ code: "", description: "" });
  const [error, setError] = useState("");

  const createMutation = trpc.costCodes.create.useMutation({
    onSuccess: () => {
      utils.costCodes.list.invalidate();
      setCreating(false);
      setNewCode({ code: "", description: "" });
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  const updateMutation = trpc.costCodes.update.useMutation({
    onSuccess: () => {
      utils.costCodes.list.invalidate();
      setEditId(null);
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  const deleteMutation = trpc.costCodes.delete.useMutation({
    onSuccess: () => utils.costCodes.list.invalidate(),
    onError: (e) => setError(e.message),
  });

  function startEdit(cc: { id: string; code: string; description: string | null }) {
    setEditId(cc.id);
    setEditValues({ code: cc.code, description: cc.description ?? "" });
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cost Codes</h1>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Cost codes let you categorize labor by job type for payroll export and job costing reports.
        Codes are attached to time entries when techs clock in.
      </p>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">{error}</div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{codes?.length ?? 0} cost codes</CardTitle>
          <Button size="sm" onClick={() => setCreating(!creating)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Code
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {creating && (
            <div className="p-4 border-b bg-gray-50 flex gap-3 items-end">
              <div className="space-y-1.5 w-36">
                <Label>Code</Label>
                <Input
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  placeholder="HVAC-SVC"
                  className="font-mono"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={newCode.description}
                  onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                  placeholder="HVAC Service Work"
                />
              </div>
              <Button
                size="sm"
                disabled={!newCode.code.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ code: newCode.code, description: newCode.description || null })}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : codes?.length === 0 && !creating ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No cost codes yet. Add one to enable job costing on time entries.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes?.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell>
                      {editId === cc.id ? (
                        <Input
                          value={editValues.code}
                          onChange={(e) => setEditValues({ ...editValues, code: e.target.value.toUpperCase() })}
                          className="h-7 font-mono text-sm"
                        />
                      ) : (
                        <Badge variant="secondary" className="font-mono">{cc.code}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editId === cc.id ? (
                        <Input
                          value={editValues.description}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">{cc.description ?? <span className="text-gray-400">No description</span>}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editId === cc.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                id: cc.id,
                                code: editValues.code,
                                description: editValues.description || null,
                              })
                            }
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => startEdit(cc)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`Delete cost code ${cc.code}?`)) {
                                deleteMutation.mutate({ id: cc.id });
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
