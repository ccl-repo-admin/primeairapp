import { Card, CardContent } from "@primeair/ui";
import { MapPin } from "lucide-react";

export default function DispatchPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dispatch Board</h1>
      <Card>
        <CardContent className="p-12 text-center">
          <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Coming in Phase 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
