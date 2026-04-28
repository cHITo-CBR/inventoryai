// Import the mobile bottom navigation component
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

// This layout wrapper applies to all pages inside the (dashboard) folder
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Main container: full screen height, light background, and bottom padding for the nav bar
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col pb-[80px]">
      {/* The main content area where individual pages (Overview, Customers, etc.) are rendered */}
      <main className="flex-1 overflow-x-hidden pt-2">
        {children}
      </main>
      
      {/* Persistent bottom navigation bar for mobile users */}
      <MobileBottomNav />
    </div>
  );
}
