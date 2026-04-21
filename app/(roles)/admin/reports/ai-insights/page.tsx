"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, Lightbulb, Loader2, Inbox, Send, Bot, User } from "lucide-react";
import { getAIInsights, type AIInsightRow } from "@/app/actions/ai-insights";

interface Message {
  role: "user" | "ai";
  text: string;
  id: string;
}

export default function AIInsightsPage() {
  // Existing insights state
  const [insights, setInsights] = useState<AIInsightRow[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hello! I'm your AI Assistant. You can ask me about sales, who our top salesman is today, or we can just chat normally. How can I help you?",
      id: "initial",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAIInsights().then((data) => {
      setInsights(data);
      setLoadingInsights(false);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();

      const aiMessage: Message = {
        role: "ai",
        text: data.reply || "I'm sorry, I couldn't process that request.",
        id: (Date.now() + 1).toString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "System error: Unable to reach the AI service.",
          id: (Date.now() + 1).toString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  function getIcon(type: string) {
    if (type === "restock" || type === "prediction") return <TrendingUp className="w-4 h-4" />;
    if (type === "anomaly" || type === "performance") return <Lightbulb className="w-4 h-4" />;
    return <Sparkles className="w-4 h-4" />;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-gray-800" />
            AI Insights & Chat
          </h1>
          <p className="text-gray-500 text-sm">Analyze inventory data and predict restock needs with Gemini AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chat Interface (Main) */}
        <div className="lg:col-span-2 flex flex-col h-[600px] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 no-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    m.role === "user" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-gray-800 text-white rounded-tr-none shadow-sm"
                      : "bg-gray-50 text-gray-800 rounded-tl-none border border-gray-200"
                  }`}>
                    {m.text}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-gray-100 text-gray-400 text-sm italic">
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-gray-50">
            {["How are our sales looking?", "Who is the top salesman?", "Any products running out of stock?", "What's up? Are you doing good?"].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="shrink-0 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-[10px] font-medium text-gray-600 hover:bg-gray-100 transition-all"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask your assistant..."
                className="w-full pl-6 pr-14 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 bottom-2 w-10 bg-gray-800 text-white rounded-xl flex items-center justify-center hover:bg-gray-700 disabled:opacity-50 transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Insights Panel (Right) */}
        <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] no-scrollbar">
          <h3 className="text-sm font-bold text-gray-700 px-1 uppercase tracking-wider opacity-60">System Insights</h3>
          {loadingInsights ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-300" /></div>
          ) : insights.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="py-8 text-center text-gray-400 text-xs">
                No system insights yet.
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => (
              <Card key={insight.id} className="shadow-sm border-gray-100 rounded-2xl overflow-hidden hover:border-green-200 transition-colors">
                <CardHeader className="py-3 px-4 bg-white border-b border-gray-100 flex flex-row items-center gap-2">
                  <div className="text-gray-800">{getIcon(insight.insight_type)}</div>
                  <CardTitle className="text-xs font-bold text-gray-800 uppercase tracking-tight">
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                  <div className="mt-3 text-[9px] text-gray-400 font-medium">
                    {new Date(insight.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
