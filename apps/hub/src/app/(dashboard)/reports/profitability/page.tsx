import { Card, CardContent, CardHeader, CardTitle } from "@primeair/ui";
import { TrendingUp } from "lucide-react";

export default function ProfitabilityPage() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Job Profitability</h1>
      <Card>
        <CardContent className="p-12 text-center">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Coming in Phase 2</p>
          <p className="text-sm text-gray-400 mt-1">
            Revenue vs. labor and parts cost per work order — available once work orders are live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
