import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAllBookings } from "@/app/actions/sales";
import { OrderTabs } from "@/components/orders/Tabs";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string }> | { tab?: string } | undefined;

export default async function AdminOrderManagementPage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getSession();

  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  const resolvedSearchParams = (await searchParams) || {};
  const activeTab = resolvedSearchParams.tab === "buyer" ? "buyer" : "salesman";

  const bookings = await getAllBookings();
  const salesmanRequests = bookings.filter((booking) => !booking.notes?.includes("Source: Buyer App"));
  const buyerRequests = bookings.filter((booking) => booking.notes?.includes("Source: Buyer App"));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      <div className="rounded-3xl border border-[#d8e6da] bg-gradient-to-br from-[#f7fbf7] via-white to-[#eef7ef] p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-2 text-sm">Review, process, and manage incoming salesman and buyer requests.</p>
        </div>
      </div>

      <OrderTabs
        activeTab={activeTab}
        salesmanRequests={salesmanRequests}
        buyerRequests={buyerRequests}
      />
    </div>
  );
}
