import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLowStock, getTopSalesman, getSalesSummary, getTopCustomer } from "./tools";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function askAI(prompt: string) {
  const lower = prompt.toLowerCase();

  try {
    // 🔹 Handle database queries FIRST (Intent detection)
    if (lower.includes("low stock") || lower.includes("stock level") || lower.includes("running out")) {
      const data = await getLowStock();
      return formatLowStock(data);
    }

    if (lower.includes("top salesman") || lower.includes("best salesman") || lower.includes("top seller")) {
      const data = await getTopSalesman();
      return formatTopSalesman(data);
    }

    if (lower.includes("top customer") || lower.includes("best store") || lower.includes("biggest client")) {
      const data = await getTopCustomer();
      return formatTopCustomer(data);
    }

    if (lower.includes("sales summary") || lower.includes("total sales") || lower.includes("how much did we sell")) {
      const data = await getSalesSummary();
      return formatSalesSummary(data);
    }

    // 🔹 Fallback to Gemini for general questions
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: "You are a friendly, human-like inventory and sales assistant for Century Pacific Food Inc. You must be very conversational and natural in your tone. You can understand and respond in English, Tagalog, and Bisaya, adapting to the user's language. CRITICAL: Do NOT use any markdown formatting in your responses (no bold, no asterisks, no headers, no bullet points). Keep your text plain, simple, and easy to read. Be flexible and answer any kind of question, even if it's casual chat."
    });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `Error: ${error.message || "Something went wrong while processing your request."}`;
  }
}

// 🔹 Formatting Helpers
function formatLowStock(data: any[]) {
  if (!data?.length) return "All products are well-stocked. No low stock items found at the moment.";
  return `Low Stock Alert:\n\n${data.map(p => `- ${p.name}: ${p.total_cases} cases left`).join("\n")}`;
}

function formatTopSalesman(data: any) {
  if (!data) return "No sales data available to determine the top salesman right now.";
  return `Our Top Salesman is ${data.name} with a total of ₱${data.total.toLocaleString()} in completed sales!`;
}

function formatTopCustomer(data: any) {
  if (!data) return "No sales data available to determine the top customer.";
  return `Our Top Customer is ${data.name} with a total purchase value of ₱${data.total.toLocaleString()}.`;
}

function formatSalesSummary(data: any) {
  return `Here is the Sales Summary:\n\nTotal Revenue: ₱${data.total.toLocaleString()}\nCompleted Transactions: ${data.count}`;
}
