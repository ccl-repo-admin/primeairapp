"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@primeair/ui";
import { CheckCircle, XCircle, Settings } from "lucide-react";

const PERM_LABELS: { key: string; label: string }[] = [
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

export default function PermissionsPage() {
  const { data: roles, isLoading } = trpc.roles.list.useQuery();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">What each role can access — enforced server-side</p>
        </div>
        <Link href="/admin/roles">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1.5" />
            Manage Custom Roles
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permission Matrix</CardTitle>
          <CardDescription>
            Permissions are set per role. Enforced in the API layer, not just the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading roles...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Permission</th>
                  {(roles ?? []).map((role) => (
                    <th key={role.id} className="px-4 py-3 text-center font-medium text-gray-500 whitespace-nowrap">
                      {role.name}
                      {!role.isBuiltIn && (
                        <span className="ml-1 text-xs text-blue-500">(custom)</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_LABELS.map(({ key, label }) => (
                  <tr key={key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{label}</td>
                    {(roles ?? []).map((role) => (
                      <td key={role.id} className="px-4 py-3 text-center">
                        {role[key as keyof typeof role] ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-200 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400">
        To modify custom role permissions, visit{" "}
        <Link href="/admin/roles" className="underline hover:text-gray-600">Roles</Link>.
        Built-in role permissions are fixed.
      </p>
    </div>
  );
}
