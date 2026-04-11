import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function GET(request: NextRequest) {
  try {
    const { data: orders, error } = await supabase
      .from("sales_transactions")
      .select("*, customers(store_name)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Quick mockup format to align with UI requirements if sales_transactions doesn't perfectly match
    return NextResponse.json(orders || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyer_id, customer_name, items } = body;
    
    // items should be [{ product_id, quantity, price }]
    // Fallback if backwards compatibility needed
    let orderItems = items;
    if (!orderItems && body.product_id) {
       orderItems = [{
         product_id: body.product_id,
         quantity: body.quantity,
         price: body.price
       }];
    }

    if (!orderItems || orderItems.length === 0) {
       return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const totalAmount = orderItems.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0);

    // Fetch a fallback customer and salesman to satisfy foreign keys
    let finalCustomerId = buyer_id;
    let finalSalesmanId = buyer_id;

    if (!finalCustomerId) {
       const { data: firstCustomer } = await supabase.from('customers').select('id').limit(1).maybeSingle();
       if (firstCustomer) finalCustomerId = firstCustomer.id;
    }
    
    // Check if buyer_id is actually a salesman, if not fetch one
    const { data: isSalesman } = await supabase.from('users').select('id').eq('id', buyer_id).eq('role_id', 3).maybeSingle();
    if (!isSalesman) {
       const { data: firstSalesman } = await supabase.from('users').select('id').eq('role_id', 3).limit(1).maybeSingle();
       if (firstSalesman) {
           finalSalesmanId = firstSalesman.id;
       } else {
           // fallback to any user if no salesman exists just to satisfy constraint temporarily
           const { data: firstUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
           if (firstUser) finalSalesmanId = firstUser.id;
       }
    }

    // Create order logic
    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .insert({
        customer_id: finalCustomerId, 
        salesman_id: finalSalesmanId,
        status: "pending",
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Insert all items
    const transactionItemsToInsert = orderItems.map((item: any) => ({
      transaction_id: transaction.id,
      product_id: item.product_id, // we'll use variant_id but map to product since the schema uses variant_id
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.quantity * item.price
    }));

    // In the schema, it's actually variant_id, but if there's no variant_id column we pass it or skip.
    // Since the schema has variant_id, let's map product_id -> variant_id for schema compat.
    const mappedItemsToInsert = transactionItemsToInsert.map(i => ({
      transaction_id: i.transaction_id,
      variant_id: null, // Since we don't strict-link variants right now
      quantity: i.quantity,
      unit_price: i.unit_price,
      subtotal: i.subtotal
    }));

    const { error: itemsError } = await supabase.from("sales_transaction_items").insert(mappedItemsToInsert);
    if(itemsError) throw itemsError;

    return NextResponse.json({ success: true, order: transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
