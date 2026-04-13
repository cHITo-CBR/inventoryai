"use server";

/**
 * ADMIN ROLE LAYOUT
 * This layout serves as the shell for all pages within the /admin route.
 * It handles:
 * - Session Validation: Ensuring the user is logged in.
 * - Role Enforcement: Restricting access only to users with the "admin" role.
 * - Navigation: Providing the sidebar and top navigation components.
 * - Global Styling: Setting the overall background and spacing for admin pages.
 */

import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication check: Redirects to login if no valid session exists
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  /**
   * ROLE-BASED ACCESS CONTROL (RBAC)
   * Hard-coded enforcement of the "admin" role.
   * Prevents salesmen or supervisors from manually typing /admin paths.
   */
  if (session.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      {/* Primary navigation sidebar configured for admin paths */}
      <AppSidebar basePath="/admin" />
      <SidebarInset className="bg-[#F4F7F6]">
        {/* Global top bar containing profile and secondary actions */}
        <TopNav />
        {/* Main content area for admin-only pages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

