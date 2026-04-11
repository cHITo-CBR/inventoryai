import supabase from "@/lib/db";

export async function GET() {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*, roles(name)")
      .eq("email", "admin@flowstock.com")
      .maybeSingle();

    if (error) throw error;

    return Response.json({ user, error: null });
  } catch (error: any) {
    return Response.json({ user: null, error: error.message });
  }
}
