"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Inbox, CheckCircle, XCircle, Truck, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateBookingStatus } from "@/app/actions/sales";

type BookingRow = {
  id: string;
  status: string;
  total_amount: number;
  notes?: string | null;
  created_at: string;
  customers?: { store_name?: string | null } | null;
  users?: { full_name?: string | null } | null;
};

interface TabsProps {
  activeTab: "salesman" | "buyer";
  salesmanRequests: BookingRow[];
  buyerRequests: BookingRow[];
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white/90 ring-1 ring-[#e5eee7]">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.18em]">{label}</p>
        <p className={`mt-1 text-2xl font-black ${tone}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RequestTable({
  bookings,
  tab,
  onStatusChange,
  loadingId,
}: {
  bookings: BookingRow[];
  tab: "salesman" | "buyer";
  onStatusChange: (id: string, status: string) => Promise<void>;
  loadingId: string | null;
}) {
  if (bookings.length === 0) {
    return <EmptyState message="No requests found for this category." />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e6efe8] bg-white shadow-sm">
      <Table>
        <TableHeader className="bg-[#f7faf7]">
          <TableRow>
            <TableHead>Date</TableHead>
            {tab === "salesman" && <TableHead>Salesman</TableHead>}
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-[#f8fbf8] transition-colors">
              <TableCell className="text-gray-500 text-sm">
                {new Date(booking.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </TableCell>
              {tab === "salesman" && (
                <TableCell className="font-medium text-gray-900">{booking.users?.full_name ?? "N/A"}</TableCell>
              )}
              <TableCell className="font-medium text-gray-900">{booking.customers?.store_name ?? "N/A"}</TableCell>
              <TableCell className="text-right font-bold text-[#005914]">{formatCurrency(booking.total_amount || 0)}</TableCell>
              <TableCell>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${statusStyles[booking.status] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                  {booking.status}
                </span>
              </TableCell>
              <TableCell className="text-right space-x-1">
                {booking.status === "pending" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-green-700 hover:bg-green-50 gap-1"
                      disabled={loadingId === booking.id}
                      onClick={() => onStatusChange(booking.id, "approved")}
                    >
                      {loadingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-700 hover:bg-red-50 gap-1"
                      disabled={loadingId === booking.id}
                      onClick={() => onStatusChange(booking.id, "cancelled")}
                    >
                      {loadingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Cancel
                    </Button>
                  </>
                )}
                {booking.status === "approved" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-700 hover:bg-blue-50 gap-1"
                    disabled={loadingId === booking.id}
                    onClick={() => onStatusChange(booking.id, "completed")}
                  >
                    {loadingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                    Complete
                  </Button>
                )}
                {booking.status !== "pending" && booking.status !== "approved" && (
                  <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Closed
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function OrderTabs({ activeTab, salesmanRequests, buyerRequests }: TabsProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const currentRequests = activeTab === "buyer" ? buyerRequests : salesmanRequests;
  const summary = {
    pending: currentRequests.filter((booking) => booking.status === "pending").length,
    approved: currentRequests.filter((booking) => booking.status === "approved").length,
    completed: currentRequests.filter((booking) => booking.status === "completed").length,
    revenue: currentRequests.reduce((sum, booking) => sum + (booking.total_amount || 0), 0),
  };

  const tabMeta = activeTab === "buyer"
    ? {
        title: "Buyers Requests",
        description: "Track direct buyer-submitted requests, status progress, and total revenue.",
      }
    : {
        title: "Salesman Requests",
        description: "Review requests submitted by salesmen and move them through the workflow.",
      };

  async function handleStatusChange(id: string, status: string) {
    setLoadingId(id);
    await updateBookingStatus(id, status);
    router.refresh();
    setLoadingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:flex gap-1 sm:gap-0 bg-[#f2f7f3] p-1.5 rounded-2xl w-full sm:w-max border border-[#d8e6da] shadow-sm overflow-x-auto scrollbar-hide">
        <button
          onClick={() => router.push(`?tab=salesman`)}
          className={cn(
            "w-full px-3 sm:px-6 py-2.5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all text-center",
            activeTab === "salesman"
              ? "bg-white text-[#005914] shadow-sm ring-1 ring-[#cfe3d4]"
              : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          Salesman Requests
        </button>
        <button
          onClick={() => router.push(`?tab=buyer`)}
          className={cn(
            "w-full px-3 sm:px-6 py-2.5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all text-center",
            activeTab === "buyer"
              ? "bg-white text-[#005914] shadow-sm ring-1 ring-[#cfe3d4]"
              : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
          )}
        >
          Buyers Requests
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={String(summary.pending)} tone="text-amber-600" />
        <StatCard label="Approved" value={String(summary.approved)} tone="text-blue-700" />
        <StatCard label="Completed" value={String(summary.completed)} tone="text-green-700" />
        <StatCard label="Revenue" value={formatCurrency(summary.revenue)} tone="text-[#005914]" />
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{tabMeta.title}</h2>
          <p className="text-sm text-gray-500">{tabMeta.description}</p>
        </div>
        <div className="text-sm font-medium text-gray-500 rounded-full bg-white px-4 py-2 border border-[#e5eee7] shadow-sm">
          {currentRequests.length} total
        </div>
      </div>

      <RequestTable bookings={currentRequests} tab={activeTab} onStatusChange={handleStatusChange} loadingId={loadingId} />
    </div>
  );
}
