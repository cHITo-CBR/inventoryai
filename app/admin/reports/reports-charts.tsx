"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["#005914", "#10B981", "#3B82F6", "#F59E0B", "#EF4444"];

interface ReportsChartsProps {
  type: "sales" | "categories";
  data: any[];
}

export default function ReportsCharts({ type, data }: ReportsChartsProps) {
  if (type === "sales") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} />
          <Tooltip
            formatter={(value: number) => [`₱${value.toLocaleString()}`, "Sales"]}
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
          />
          <Bar dataKey="total" fill="#005914" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "categories") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RPieChart>
          <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, "Sales"]} />
        </RPieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}