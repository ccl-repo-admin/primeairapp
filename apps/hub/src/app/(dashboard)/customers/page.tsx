"use client";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Button, Card, CardContent,
  Input,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@primeair/ui";
import { Plus, Search, Users } from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: customers, isLoading } = trpc.customers.list.useQuery({
    search: debouncedSearch || undefined,
    limit: 100,
  });

  function handleSearch(val: string) {
    setSearch(val);
    clearTimeout((window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
    (window as unknown as { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">{customers?.length ?? 0} customers</p>
        </div>
        <Link href="/customers/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Customer
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, phone, email..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : customers?.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">
                {debouncedSearch ? "No customers match your search" : "No customers yet"}
              </p>
              {!debouncedSearch && (
                <Link href="/customers/new">
                  <Button size="sm">Add your first customer</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Work Orders</TableHead>
                  <TableHead>Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/customers/${c.id}`} className="font-medium text-sm hover:underline text-[#1B3A6B]">
                        {c.firstName} {c.lastName ?? ""}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{c.companyName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{c.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-center">{c._count.workOrders}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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
