"use client";

import { useState } from "react";
import { updateBookingStatus } from "@/app/actions/sales";
import { Loader2, Eye, Edit2 } from "lucide-react";

interface OrderRow {
  id: string;
  order_id: string;
  buyer_name: string;
  salesman_name: string;
  order_date: string;
  product_name: string;
  payment_status: string;
  status: string;
}

interface OrdersTableProps {
  orders: OrderRow[];
}

const statusColors: Record<string, string> = {
  for_approval: "bg-purple-50 text-purple-700 border border-purple-200",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  processing: "bg-orange-50 text-orange-700 border border-orange-200",
  approved: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  cancelled: "bg-red-50 text-red-700 border border-red-200",
};

export function OrdersTable({ orders }: OrdersTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, newStatus: string) {
    setLoadingId(id);
    await updateBookingStatus(id, newStatus);
    setLoadingId(null);
  }

  async function handleApprove(id: string) {
    setLoadingId(id);
    // When approved: status -> 'pending', booking_type -> 'salesman'
    await updateBookingStatus(id, "pending");
    setLoadingId(null);
  }

  async function handleReject(id: string) {
    setLoadingId(id);
    await updateBookingStatus(id, "cancelled");
    setLoadingId(null);
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
        No requests found for this category.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-left text-sm text-gray-700">
        <thead className="bg-gray-50/50 text-xs uppercase font-medium text-gray-500 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4">Order ID</th>
            <th className="px-6 py-4">Buyer Name</th>
            <th className="px-6 py-4">Salesman Name</th>
            <th className="px-6 py-4">Order Date</th>
            <th className="px-6 py-4">Product Name</th>
            <th className="px-6 py-4">Payment</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-semibold text-gray-800">{order.order_id}</td>
              <td className="px-6 py-4">{order.buyer_name}</td>
              <td className="px-6 py-4 flex items-center gap-2">
                 {order.salesman_name}
                 <button className="text-gray-400 hover:text-gray-900 transition-colors"><Edit2 className="w-3 h-3" /></button>
              </td>
              <td className="px-6 py-4">{new Date(order.order_date).toLocaleDateString()}</td>
              <td className="px-6 py-4 truncate max-w-[200px]">{order.product_name}</td>
              <td className="px-6 py-4 capitalize">{order.payment_status}</td>
              <td className="px-6 py-4">
                {order.status === "for_approval" ? (
                  <span className={`text-xs font-bold px-2.5 py-1.5 rounded-full uppercase border ${statusColors[order.status]}`}>
                    FOR APPROVAL
                  </span>
                ) : (
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={loadingId === order.id}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-full uppercase outline-none appearance-none cursor-pointer border ${statusColors[order.status] || "bg-gray-500/20 text-gray-400"}`}
                  >
                    <option value="pending" className="bg-white text-yellow-600">PENDING</option>
                    <option value="processing" className="bg-white text-orange-600">PROCESSING</option>
                    <option value="completed" className="bg-white text-green-600">COMPLETED</option>
                    <option value="cancelled" className="bg-white text-red-600">CANCELLED</option>
                  </select>
                )}
                {loadingId === order.id && <Loader2 className="w-3 h-3 animate-spin inline-block ml-2 text-gray-400" />}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                {order.status === "for_approval" ? (
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleApprove(order.id)}
                      disabled={loadingId === order.id}
                      className="text-white bg-green-600 hover:bg-green-700 transition-colors text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleReject(order.id)}
                      disabled={loadingId === order.id}
                      className="text-white bg-red-600 hover:bg-red-700 transition-colors text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1 shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <button className="text-[#005914] hover:text-[#005914]/80 transition-colors text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#005914]/10 inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View Progress
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
