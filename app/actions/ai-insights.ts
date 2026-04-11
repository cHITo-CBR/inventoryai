"use server";

// AI Insights — this table may not exist yet in your schema.
// Returns an empty array gracefully if the table is missing.

export interface AIInsightRow {
  id: string;
  insight_type: string;
  title: string;
  description: string | null;
  severity: string;
  data: any;
  created_at: string;
}

export async function getAIInsights(): Promise<AIInsightRow[]> {
  try {
    // The ai_insights table is optional; return empty if not present
    const supabase = (await import("@/lib/db")).default;
    const { data, error } = await supabase
      .from("ai_insights")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist — that's expected
      console.warn("AI insights table not available:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      ...row,
      data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
    }));
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return [];
  }
}
