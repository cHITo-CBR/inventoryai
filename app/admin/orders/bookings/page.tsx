"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Inbox, CheckCircle, XCircle, Truck, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getAllBookings, updateBookingStatus } from "@/app/actions/sales";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("salesman");

  async function load() {
    const data = await getAllBookings();
    setBookings(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleStatusChange(id: string, status: string) {
    setActionLoading(id);
    await updateBookingStatus(id, status);
    await load();
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#005914]" />
      </div>
    );
  }

  const salesmanBookings = bookings.filter(b => !b.notes?.includes("Source: Buyer App"));
  const buyerBookings = bookings.filter(b => b.notes?.includes("Source: Buyer App"));
  
  const currentBookings = activeTab === "salesman" ? salesmanBookings : buyerBookings;
  const currentRevenue = currentBookings.reduce((s, b) => s + (b.total_amount || 0), 0);

  const renderBookingsCard = (filteredBookings: any[], title: string) => (
      <Card className="shadow-sm border-0 rounded-xl">
        <CardHeader className="py-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBookings.length === 0 ? (
            <EmptyState message={`No ${title.toLowerCase()} found`} />
          ) : (
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  {title === "Salesman Bookings" && <TableHead>Salesman</TableHead>}
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((b) => (
                  <TableRow key={b.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </TableCell>
                    {title === "Salesman Bookings" && (
                       <TableCell className="font-medium text-gray-900">{b.users?.full_name ?? "N/A"}</TableCell>
                    )}
                    <TableCell>{b.customers?.store_name ?? "N/A"}</TableCell>
                    <TableCell className="text-right font-bold">₱{(b.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase ${statusStyles[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => { setDetail(b); setDetailOpen(true); }}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                      {b.status === "pending" && (
                        <>
                          <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:bg-green-50 gap-1" disabled={actionLoading === b.id} onClick={() => handleStatusChange(b.id, "approved")}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-red-600 hover:bg-red-50 gap-1" disabled={actionLoading === b.id} onClick={() => handleStatusChange(b.id, "cancelled")}>
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </Button>
                        </>
                      )}
                      {b.status === "approved" && (
                        <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:bg-blue-50 gap-1" disabled={actionLoading === b.id} onClick={() => handleStatusChange(b.id, "completed")}>
                          <Truck className="w-3.5 h-3.5" /> Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Booking Management</h1>
        <p className="text-gray-500 text-sm">Manage field orders and bookings placed by salesmen and direct buyers.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: currentBookings.length.toString(), color: "text-gray-900" },
          { label: "Pending", value: currentBookings.filter(b => b.status === "pending").length.toString(), color: "text-amber-600" },
          { label: "Completed", value: currentBookings.filter(b => b.status === "completed").length.toString(), color: "text-green-600" },
          { label: "Total Revenue", value: `₱${currentRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, color: "text-[#005914]" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-500 uppercase">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="salesman" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[#005914] data-[state=active]:shadow-sm px-5 py-2 text-sm font-bold transition-all">
            Salesman Bookings ({salesmanBookings.length})
          </TabsTrigger>
          <TabsTrigger value="buyer" className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[#005914] data-[state=active]:shadow-sm px-5 py-2 text-sm font-bold transition-all">
            Buyers Bookings ({buyerBookings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="salesman" className="focus-visible:outline-none">
           {renderBookingsCard(salesmanBookings, "Salesman Bookings")}
        </TabsContent>
        <TabsContent value="buyer" className="focus-visible:outline-none">
           {renderBookingsCard(buyerBookings, "Buyers Bookings")}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Detail</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{detail.customers?.store_name}</span></div>
                <div><span className="text-gray-500">Salesman:</span> <span className="font-medium">{detail.users?.full_name}</span></div>
                <div><span className="text-gray-500">Total:</span> <span className="font-bold text-[#005914]">₱{(detail.total_amount || 0).toLocaleString()}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${statusStyles[detail.status]}`}>{detail.status}</span></div>
              </div>
              {detail.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg italic">"{detail.notes}"</p>}
              {detail.sales_transaction_items?.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.sales_transaction_items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_variants?.name || "N/A"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{(item.unit_price || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">₱{(item.subtotal || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
