import { Sidebar } from "@/components/sidebar";
import { NavigationProgress } from "@/components/navigation-progress";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <NavigationProgress />
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
