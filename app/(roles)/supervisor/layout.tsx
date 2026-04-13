"use server";

/**
 * SUPERVISOR ROLE LAYOUT
 * This layout serves as the command shell for team leaders (Supervisors).
 * It manages:
 * - Authentication: Ensuring the supervisor is logged in via their session.
 * - Role Check: Restricting access only to those with "supervisor" credentials.
 * - Interface composition: Rendering the team-specific sidebar and top navigation.
 */

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication: Required to view any team-level data
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  /**
   * TEAM OVERSEER CHECK
   * Prevents standard salesmen or admins from entering the supervisor-only dashboard.
   */
  if (session.user.role !== "supervisor") {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      {/* Sidebar navigation filtered for supervisory and team monitoring tools */}
      <AppSidebar basePath="/supervisor" />
      <SidebarInset className="bg-[#F4F7F6]">
        {/* Global profile and navigation header */}
        <TopNav />
        {/* Main analytical area for monitoring team bookings and catalog */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

