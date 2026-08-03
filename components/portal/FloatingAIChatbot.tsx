"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, User, Bot } from "lucide-react";

export function FloatingAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Namaste! I'm AntBox Chachi 💅✨ — your friendly HR Assistant! I'm here to help you with leaves, attendance, company policies, or any questions on your mind. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Arré! Chachi is having trouble connecting right now. Please try again in a moment!",
          },
        ]);
      }
    } catch (err) {
      console.error("[Chat Widget] Error sending message:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "An error occurred. Please verify your connection or check GEMINI_API_KEY environment variable.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-950 text-white shadow-2xl hover:bg-zinc-800 hover:scale-105 transition-all relative group border-2 border-violet-500/30"
          title="Chat with AntBox Chachi 💅✨"
        >
          <MessageSquare className="h-6 w-6 text-violet-400" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white animate-pulse">
            ✨
          </span>
          <span className="absolute right-16 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all bg-zinc-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap font-bold border border-violet-500/20">
            Ask AntBox Chachi 💅
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="flex h-[500px] w-[380px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-zinc-950 via-zinc-900 to-violet-950 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/30 border border-violet-400/40 text-sm">
                💅
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>AntBox Chachi</span>
                  <span className="text-[9px] font-semibold bg-violet-500/30 text-violet-200 px-1.5 py-0.2 rounded">HR Assistant</span>
                </h4>
                <p className="text-[9px] text-zinc-400 leading-none mt-0.5">Your Friendly HR Companion ✨</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-50 p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                    msg.role === "user" ? "bg-zinc-950 text-white" : "bg-white border border-zinc-200 text-zinc-700"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-zinc-950 text-white rounded-tr-none"
                      : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="max-w-[75%] rounded-2xl rounded-tl-none bg-white border border-zinc-200 px-3.5 py-2.5 text-xs text-zinc-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="flex border-t border-zinc-200 bg-white p-3 gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me a question..."
              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none focus:border-zinc-950 text-zinc-900"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
