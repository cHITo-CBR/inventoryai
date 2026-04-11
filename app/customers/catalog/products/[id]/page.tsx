"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Heart, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { getProductDetail } from "@/app/actions/buyer-actions";
import { getCurrentUser } from "@/app/actions/auth";
import Image from "next/image";

export default function MobileProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("buyer_cart");
    if (savedCart) setCart(JSON.parse(savedCart));

    getCurrentUser().then(s => setUser(s?.user));
    if (params.id) {
      getProductDetail(params.id as string).then((d) => { setProduct(d); setLoading(false); });
    }
  }, [params.id]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#4B5E65]" /></div>;
  if (!product) return <div className="text-center py-16 text-gray-400">Product not found</div>;

  const primaryImage = product.product_images?.find((img: any) => img.is_primary)?.image_url || product.product_images?.[0]?.image_url;
  const price = Number(product.packaging_price || 0);

  const currentSelectionTotal = quantity * price;
  const cartTotal = cart.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const grandTotal = currentSelectionTotal + cartTotal;

  const handleAddProduct = () => {
    const newItem = {
      product_id: product.id,
      name: product.name,
      quantity,
      price
    };
    const updatedCart = [...cart, newItem];
    setCart(updatedCart);
    localStorage.setItem("buyer_cart", JSON.stringify(updatedCart));
    
    // Reset quantity after adding
    setQuantity(1);
    
    if (window.confirm(`${quantity} cases of ${product.name} added to booking cart! Do you want to browse more products?`)) {
      router.push("/customers/catalog/products");
    }
  };

  const handleBookNow = async () => {
    setBooking(true);
    try {
      const itemsToBook = [...cart, { product_id: product.id, name: product.name, quantity, price }];
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_id: user?.id,
          customer_name: user?.full_name,
          items: itemsToBook
        })
      });
      if (res.ok) {
        localStorage.removeItem("buyer_cart");
        router.push("/customers/bookings");
      } else {
        alert("Failed to confirm booking");
      }
    } catch (e) {
      alert("Error processing booking");
    }
    setBooking(false);
  };

  return (
    <div className="pb-24 pt-2 flex flex-col min-h-screen">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/customers/catalog/products" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-red-500 transition-colors">
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Product Image */}
      <div className="relative w-full aspect-[4/5] bg-[#1A1D20] rounded-[32px] overflow-hidden mb-6 shadow-xl shadow-black/5">
        {primaryImage ? (
          <Image src={primaryImage} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl text-white/10 font-black">{product.name.substring(0,1)}</span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
          {product.total_cases !== undefined && product.total_cases !== null && (
             <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
               {product.total_cases} CASES
             </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-[24px] font-bold text-gray-900 leading-tight flex-1 pr-4">
            {product.name}
          </h1>
          <span className="text-[22px] font-black text-[#556987]">
            ₱{price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {(product.total_packaging || product.net_weight) && (
          <p className="text-[14px] text-gray-400 font-medium mb-4 uppercase tracking-tight">
            {product.total_packaging ? `${product.total_packaging} x ` : ''}{product.net_weight || ''}
          </p>
        )}

        {product.brands?.name && (
          <p className="text-[14px] text-gray-500 font-medium mb-4">
            {product.brands.name}
          </p>
        )}

        {product.description && (
           <p className="text-[14px] text-gray-500 leading-relaxed mb-6">
             {product.description}
           </p>
        )}

        <div className="bg-white p-4 rounded-[20px] shadow-sm border border-gray-50 flex items-center justify-between mb-8">
          <span className="text-[14px] font-bold text-gray-900 tracking-wide">Quantity (Cases)</span>
          <div className="flex items-center gap-4 bg-[#F8F9FB] rounded-full p-1">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-4 text-center font-bold text-[14px] text-[#4B5E65]">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {cart.length > 0 && (
          <div className="bg-[#F8F9FB] rounded-[20px] p-5 mb-8 border border-[#E2E5E9]">
            <h3 className="text-[12px] font-bold text-gray-500 mb-3 uppercase tracking-wider flex justify-between items-center">
              <span>Your Previous Booked Products</span>
              <span className="bg-white px-2 py-0.5 rounded-full text-[10px] shadow-sm">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
            </h3>
            <div className="space-y-3">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[13px] border-b border-gray-200/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-col pr-4">
                    <span className="font-bold text-gray-800 leading-tight mb-0.5">{item.name}</span>
                    <span className="text-[11px] text-gray-500 font-medium">Qty: {item.quantity} cases @ ₱{(item.price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}/ea</span>
                  </div>
                  <span className="font-black text-[#4B5E65] shrink-0">₱{(item.price * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/60 flex justify-between items-center text-[13px]">
               <span className="font-bold text-gray-500">Cart Subtotal</span>
               <span className="font-black text-[#4B5E65]">₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="mt-auto pt-4 space-y-3">
        <button 
          onClick={handleAddProduct}
          className="w-full h-14 bg-[#EEF0F2] text-[#4B5E65] hover:bg-[#E2E5E9] font-black text-[15px] rounded-full active:scale-[0.98] transition-all flex items-center justify-center uppercase tracking-wide"
        >
          Add Products
        </button>
        <button 
          onClick={handleBookNow}
          disabled={booking}
          className="w-full h-14 bg-[#4B5E65] text-white font-black text-[15px] rounded-full shadow-lg shadow-[#4B5E65]/30 active:scale-[0.98] transition-transform flex flex-col items-center justify-center uppercase tracking-wide leading-tight py-1.5"
        >
          {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <span>Book Now</span>
              <span className="text-[11px] opacity-80 font-semibold tracking-normal mt-0.5">Total: ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
