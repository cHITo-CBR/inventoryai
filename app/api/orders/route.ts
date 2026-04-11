import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { data: orders, error } = await supabase
      .from("sales_transactions")
      .select("id, status, total_amount, notes, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const orderIds = (orders || []).map((o: any) => o.id);
    let itemsMap = new Map<number, any[]>();

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("sales_transaction_items")
        .select("transaction_id, variant_id, quantity, unit_price, subtotal")
        .in("transaction_id", orderIds);

      for (const item of (items || [])) {
        if (!itemsMap.has(item.transaction_id)) itemsMap.set(item.transaction_id, []);
        itemsMap.get(item.transaction_id)!.push(item);
      }
    }

    const mapped = (orders || []).map((o: any) => {
      const txItems = itemsMap.get(o.id) || [];
      return {
        ...o,
        product_name: txItems.length > 0 ? `${txItems.length} Item(s)` : "No items",
        quantity: txItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0),
        items: txItems,
      };
    });

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, items } = body;

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

    let finalSalesmanId = user_id;
    const { data: validUser } = await supabase.from('users').select('id').eq('id', user_id).maybeSingle();
    if (!validUser) {
       const { data: firstUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
       if (firstUser) finalSalesmanId = firstUser.id;
    }

    // Insert into sales_transactions
    const { data: transaction, error: transactionError } = await supabase
      .from("sales_transactions")
      .insert({
        salesman_id: finalSalesmanId,
        status: "for_approval",
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Insert items
    const mappedItemsToInsert = orderItems.map((item: any) => ({
      transaction_id: transaction.id,
      variant_id: item.variant_id || item.product_id, 
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.quantity * item.price,
    }));

    const { error: itemsError } = await supabase.from("sales_transaction_items").insert(mappedItemsToInsert);
    if (itemsError) throw itemsError;

    return NextResponse.json({ success: true, order: transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
