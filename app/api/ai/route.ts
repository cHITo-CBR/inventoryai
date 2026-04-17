import { askAI } from "@/lib/ai/ai.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        reply: "⚠️ **Developer Note:** Gemini API key is missing. Please add `GEMINI_API_KEY` to your `.env.local` to enable AI features." 
      });
    }

    const reply = await askAI(message);
    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
