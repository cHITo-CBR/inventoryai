"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { QuotaRow, createQuota, updateQuota, getSalesmenForQuota } from "@/app/actions/quotas";

interface QuotaFormDialogProps {
  open: boolean;
  onClose: () => void;
  quota?: QuotaRow | null;
}

export default function QuotaFormDialog({ open, onClose, quota }: QuotaFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [loadingSalesmen, setLoadingSalesmen] = useState(true);

  useEffect(() => {
    if (open) {
      loadSalesmen();
    }
  }, [open]);

  async function loadSalesmen() {
    try {
      const data = await getSalesmenForQuota();
      setSalesmen(data);
    } catch (error) {
      console.error("Error loading salesmen:", error);
    } finally {
      setLoadingSalesmen(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      let result;
      if (quota) {
        result = await updateQuota(quota.id, formData);
      } else {
        result = await createQuota(formData);
      }

      if (result.success) {
        onClose();
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        alert(result.error || "Failed to save quota");
      }
    } catch (error) {
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{quota ? "Edit Quota" : "Create New Quota"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!quota && (
            <div className="space-y-2">
              <Label htmlFor="salesman_id">Salesman</Label>
              <Select name="salesman_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select salesman" />
                </SelectTrigger>
                <SelectContent>
                  {loadingSalesmen ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    salesmen.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {quota && (
            <div className="space-y-2">
              <Label>Salesman</Label>
              <div className="p-2 bg-gray-50 rounded border">
                <p className="font-medium">{quota.salesman_name}</p>
                <p className="text-sm text-gray-500">{quota.salesman_email}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select name="month" defaultValue={quota?.month?.toString() || currentMonth.toString()} required>
                <SelectTrigger>
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleDateString("en-US", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select name="year" defaultValue={quota?.year?.toString() || currentYear.toString()} required>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (
                    <SelectItem key={currentYear + i} value={(currentYear + i).toString()}>
                      {currentYear + i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Target Amount (₱)</Label>
            <Input
              id="target_amount"
              name="target_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="50000.00"
              defaultValue={quota?.target_amount || ""}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_units">Target Units (Optional)</Label>
              <Input
                id="target_units"
                name="target_units"
                type="number"
                min="0"
                placeholder="100"
                defaultValue={quota?.target_units || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_orders">Target Orders (Optional)</Label>
              <Input
                id="target_orders"
                name="target_orders"
                type="number"
                min="0"
                placeholder="25"
                defaultValue={quota?.target_orders || ""}
              />
            </div>
          </div>

          {quota && (
            <>
              <div className="space-y-2">
                <Label htmlFor="achieved_amount">Achieved Amount (₱)</Label>
                <Input
                  id="achieved_amount"
                  name="achieved_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25000.00"
                  defaultValue={quota.achieved_amount}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="achieved_units">Achieved Units</Label>
                  <Input
                    id="achieved_units"
                    name="achieved_units"
                    type="number"
                    min="0"
                    defaultValue={quota.achieved_units}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="achieved_orders">Achieved Orders</Label>
                  <Input
                    id="achieved_orders"
                    name="achieved_orders"
                    type="number"
                    min="0"
                    defaultValue={quota.achieved_orders}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={quota.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {quota ? "Update Quota" : "Create Quota"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}