"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Edit, Plus, Trash2 } from "lucide-react";
import { QuotaRow } from "@/app/actions/quotas";
import QuotaFormDialog from "./quota-form-dialog";

interface QuotaTableProps {
  quotas: QuotaRow[];
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  ongoing: "bg-blue-100 text-blue-800", 
  completed: "bg-green-100 text-green-800"
};

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function QuotaTable({ quotas }: QuotaTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<QuotaRow | null>(null);

  const handleEdit = (quota: QuotaRow) => {
    setEditingQuota(quota);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingQuota(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingQuota(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Monthly Quotas</h3>
        <Button onClick={handleAddNew} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Quota
        </Button>
      </div>

      {quotas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No quotas set yet.</p>
          <Button onClick={handleAddNew} variant="outline" className="mt-2">
            Set Your First Quota
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Target Amount</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotas.map((quota) => {
                const progressPercentage = quota.amount_percentage || 0;
                
                return (
                  <TableRow key={quota.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quota.salesman_name || "Unknown"}</p>
                        <p className="text-sm text-gray-500">{quota.salesman_email}</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <p className="font-medium">{monthNames[quota.month - 1]} {quota.year}</p>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">₱{quota.target_amount?.toLocaleString() || "—"}</p>
                        {quota.target_units && (
                          <p className="text-xs text-gray-500">{quota.target_units} units</p>
                        )}
                        {quota.target_orders && (
                          <p className="text-xs text-gray-500">{quota.target_orders} orders</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">₱{quota.achieved_amount.toLocaleString()}</p>
                        {quota.achieved_units > 0 && (
                          <p className="text-xs text-gray-500">{quota.achieved_units} units</p>
                        )}
                        {quota.achieved_orders > 0 && (
                          <p className="text-xs text-gray-500">{quota.achieved_orders} orders</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-2">
                        <Progress value={progressPercentage} className="w-20" />
                        <p className="text-xs text-gray-500">{progressPercentage.toFixed(1)}%</p>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className={statusColors[quota.status]}>
                        {quota.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(quota)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <QuotaFormDialog 
        open={dialogOpen}
        onClose={handleCloseDialog}
        quota={editingQuota}
      />
    </div>
  );
}