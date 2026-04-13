"use server";

/**
 * SALESMAN ROLE LAYOUT
 * This layout serves as the mobile-friendly shell for the salesman's interface.
 * Key responsibilities:
 * - Session Management: Validates that the agent is authenticated.
 * - Guard Rails: Ensures that only users with "salesman" permissions can access field tools.
 * - Layout Composition: Integrates the sidebar and top navigation tailored for field agents.
 */

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SalesmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session verification: Required for every page in the /salesman route
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  /**
   * SECURITY ENFORCEMENT
   * Restricts workspace to legitimate field personnel.
   */
  if (session.user.role !== "salesman") {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      {/* Sidebar navigation specifically filtered for salesman capabilities */}
      <AppSidebar basePath="/salesman" />
      <SidebarInset className="bg-[#F4F7F6]">
        {/* Universal top bar for profile settings and alerts */}
        <TopNav />
        {/* Main interactive area for dashboard, customers, and bookings */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

