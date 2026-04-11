"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, PackageOpen, Loader2, Inbox, Eye } from "lucide-react";
import { getProducts, type ProductRow } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export default function SalesmanProductCatalogPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingProduct, setViewingProduct] = useState<ProductRow | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await getProducts(search);
    setProducts(data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 text-sm">Browse available products, prices, and stock levels.</p>
        </div>
      </div>

      <Card className="shadow-sm border-0 rounded-xl">
        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="flex gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products, brands..."
                className="pl-9 h-9 border-gray-200 bg-gray-50 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-[#005914]" />
            </div>
          ) : products.length === 0 ? (
            <EmptyState message="No products found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Product Name</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Category</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Brand</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Price/Case</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Packaging</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Weight</TableHead>
                    <TableHead className="text-xs uppercase font-bold tracking-wider">Stock Status</TableHead>
                    <TableHead className="text-right text-xs uppercase font-bold tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                            {p.image_url ? (
                              <img 
                                src={p.image_url} 
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <PackageOpen className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className="font-bold text-[#005914] text-sm">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">{p.category_name ?? "—"}</TableCell>
                      <TableCell className="text-gray-500 font-medium text-sm">{p.brand_name ?? "—"}</TableCell>
                      <TableCell className="text-gray-900 font-bold text-sm">
                        {p.packaging_price && typeof p.packaging_price === 'number' && p.packaging_price > 0 ? 
                          `₱${p.packaging_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {p.total_packaging || "—"}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {p.net_weight || "—"}
                      </TableCell>
                      <TableCell className="">
                        <div className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          p.total_cases === 0 ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 
                          p.total_cases < 10 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 
                          'bg-emerald-50 text-[#005914] ring-1 ring-emerald-200'
                        }`}>
                          {p.total_cases === 0 ? 'Out of Stock' : `${p.total_cases} Cases`}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 text-[#005914]"
                          onClick={() => setViewingProduct(p)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <Dialog open={!!viewingProduct} onOpenChange={(open) => !open && setViewingProduct(null)}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl rounded-3xl p-0 overflow-hidden">
          {viewingProduct && (
            <div className="relative">
              <div className="h-48 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {viewingProduct.image_url ? (
                  <img 
                    src={viewingProduct.image_url} 
                    alt={viewingProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PackageOpen className="w-20 h-20 text-gray-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <h2 className="text-xl font-black text-white">{viewingProduct.name}</h2>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{viewingProduct.brand_name || 'No Brand'}</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</Label>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {viewingProduct.description || "No description available for this product."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Packaging Price</Label>
                    <p className="text-lg font-black text-[#005914]">
                      ₱{viewingProduct.packaging_price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Stock Availability</Label>
                    <p className={`text-lg font-black ${viewingProduct.total_cases > 0 ? 'text-[#005914]' : 'text-red-500'}`}>
                      {viewingProduct.total_cases} Cases
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Category</p>
                    <p className="text-sm font-semibold text-gray-700">{viewingProduct.category_name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Packaging</p>
                    <p className="text-sm font-semibold text-gray-700">{viewingProduct.total_packaging || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Net Weight</p>
                    <p className="text-sm font-semibold text-gray-700">{viewingProduct.net_weight || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
