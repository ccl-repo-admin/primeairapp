"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Button, Badge, Card, CardContent, CardHeader, CardTitle,
  Input, Label,
} from "@primeair/ui";
import { Plus, Trash2, ChevronDown, ChevronUp, Lock } from "lucide-react";

const PERM_LABELS: { key: string; label: string }[] = [
  { key: "hubAccess", label: "Hub (web) access" },
  { key: "timeclockAccess", label: "Timeclock app access" },
  { key: "canClockIn", label: "Clock in/out" },
  { key: "canViewOwnTimecards", label: "View own timecards" },
  { key: "canEditTimecards", label: "Edit timecards" },
  { key: "canApproveTimecards", label: "Approve timecards" },
  { key: "canAssignWorkOrders", label: "Assign work orders" },
  { key: "canManageCustomers", label: "Manage customers" },
  { key: "canViewReports", label: "View reports" },
  { key: "canExportPayroll", label: "Export payroll" },
  { key: "canManageTeam", label: "Manage team" },
  { key: "canManageAdmin", label: "Admin settings" },
  { key: "canManageRoles", label: "Manage roles" },
  { key: "canManageBilling", label: "Billing" },
];

type RolePerms = {
  hubAccess: boolean; timeclockAccess: boolean; canClockIn: boolean;
  canViewOwnTimecards: boolean; canEditTimecards: boolean; canApproveTimecards: boolean;
  canAssignWorkOrders: boolean; canManageCustomers: boolean; canViewReports: boolean;
  canExportPayroll: boolean; canManageTeam: boolean; canManageAdmin: boolean;
  canManageRoles: boolean; canManageBilling: boolean;
};

function emptyPerms(): RolePerms {
  return {
    hubAccess: false, timeclockAccess: false, canClockIn: false,
    canViewOwnTimecards: false, canEditTimecards: false, canApproveTimecards: false,
    canAssignWorkOrders: false, canManageCustomers: false, canViewReports: false,
    canExportPayroll: false, canManageTeam: false, canManageAdmin: false,
    canManageRoles: false, canManageBilling: false,
  };
}

export default function RolesPage() {
  const utils = trpc.useUtils();
  const { data: roles, isLoading } = trpc.roles.list.useQuery();

  const createMutation = trpc.roles.create.useMutation({
    onSuccess: () => { utils.roles.list.invalidate(); setCreating(false); setNewName(""); setNewPerms(emptyPerms()); },
  });
  const updateMutation = trpc.roles.update.useMutation({
    onSuccess: () => { utils.roles.list.invalidate(); setExpandedId(null); },
  });
  const deleteMutation = trpc.roles.delete.useMutation({
    onSuccess: () => utils.roles.list.invalidate(),
  });

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPerms, setNewPerms] = useState<RolePerms>(emptyPerms());

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<Record<string, RolePerms>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function startEdit(id: string, role: RolePerms) {
    setEditPerms((prev) => ({ ...prev, [id]: { ...role } }));
    setExpandedId(id);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    setError("");
    createMutation.mutate({ name: newName.trim(), description: newDesc.trim() || null, ...newPerms }, {
      onError: (e) => setError(e.message),
    });
  }

  function handleUpdate(id: string) {
    const perms = editPerms[id];
    if (!perms) return;
    updateMutation.mutate({ id, ...perms }, {
      onError: (e) => setError(e.message),
    });
  }

  const builtIn = (roles ?? []).filter((r) => r.isBuiltIn);
  const custom = (roles ?? []).filter((r) => !r.isBuiltIn);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">Manage role permissions. Built-in roles are read-only.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Custom Role
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>
      )}

      {/* Create form */}
      {creating && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Custom Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lead Dispatcher" />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PERM_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPerms[key as keyof RolePerms]}
                    onChange={(e) => setNewPerms((p) => ({ ...p, [key]: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setCreating(false); setError(""); }}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending || !newName.trim()}>
                {createMutation.isPending ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="text-center text-gray-500 py-8">Loading roles...</div>}

      {/* Built-in roles */}
      {builtIn.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Built-in Roles</h2>
          <div className="space-y-2">
            {builtIn.map((role) => (
              <Card key={role.id} className="border-gray-200">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <span className="font-medium text-sm">{role.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{role._count.users} user{role._count.users !== 1 ? "s" : ""}</span>
                      </div>
                      {role.hubAccess && <Badge variant="info" className="text-xs">Hub</Badge>}
                      {role.timeclockAccess && <Badge variant="secondary" className="text-xs">Timeclock</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-sm justify-end">
                      {PERM_LABELS.filter(({ key }) => role[key as keyof typeof role] === true).map(({ label }) => (
                        <span key={label} className="text-xs bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5">{label}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Custom roles */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Custom Roles</h2>
        {custom.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-400 text-sm">
              No custom roles yet. Create one to customize permissions beyond the built-in roles.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {custom.map((role) => {
              const isExpanded = expandedId === role.id;
              const perms = editPerms[role.id] ?? role;
              return (
                <Card key={role.id}>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{role.name}</span>
                        <span className="text-xs text-gray-400">{role._count.users} user{role._count.users !== 1 ? "s" : ""}</span>
                        {role.hubAccess && <Badge variant="info" className="text-xs">Hub</Badge>}
                        {role.timeclockAccess && <Badge variant="secondary" className="text-xs">Timeclock</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => isExpanded ? setExpandedId(null) : startEdit(role.id, role as unknown as RolePerms)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {isExpanded ? "Collapse" : "Edit Permissions"}
                        </Button>
                        {deleteConfirmId === role.id ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate({ id: role.id }, { onError: (e) => setError(e.message) })}>
                              {deleteMutation.isPending ? "..." : "Delete"}
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(role.id)}
                            disabled={role._count.users > 0}
                            title={role._count.users > 0 ? "Reassign users before deleting" : undefined}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t pt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {PERM_LABELS.map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={perms[key as keyof RolePerms] as boolean}
                                onChange={(e) => setEditPerms((prev) => ({
                                  ...prev,
                                  [role.id]: { ...prev[role.id]!, [key]: e.target.checked },
                                }))}
                                className="rounded border-gray-300"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setExpandedId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleUpdate(role.id)} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? "Saving..." : "Save Permissions"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
