import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@primeair/ui";
import { Clock, Download, TrendingUp, DollarSign, Tag } from "lucide-react";

const reports = [
  {
    href: "/reports/labor",
    title: "Labor Summary",
    description: "Hours by technician — regular, overtime, double-time — with pay totals",
    icon: Clock,
  },
  {
    href: "/reports/timecards",
    title: "Timecard Export",
    description: "Export approved timecards as CSV or QuickBooks IIF format",
    icon: Download,
  },
  {
    href: "/reports/payroll",
    title: "Payroll Export",
    description: "Export pay-period hours for Gusto, ADP WorkforceNow, or generic CSV",
    icon: DollarSign,
  },
  {
    href: "/reports/cost-codes",
    title: "Cost Code Summary",
    description: "Labor hours and cost broken down by job category or cost code",
    icon: Tag,
  },
  {
    href: "/reports/profitability",
    title: "Job Profitability",
    description: "Revenue vs. labor and parts cost per work order (Phase 2)",
    icon: TrendingUp,
  },
];

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Payroll, labor, and profitability analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
