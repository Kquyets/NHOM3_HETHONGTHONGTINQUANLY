"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkle,
  PaperPlaneRight,
  ArrowsCounterClockwise,
  X,
  CaretDown,
  Robot,
  Copy,
  Check,
} from "@phosphor-icons/react";
import { useAuth } from "../../lib/auth-context";
import { apiClient } from "../../lib/api-client";

type ChatItem = {
  id: string;
  role: "user" | "model";
  text: string;
  toolsUsed?: string[];
  suggestions?: string[];
  timestamp: Date;
};

const INITIAL_SUGGESTIONS = [
  "Tháng này có bao nhiêu phòng chưa thanh toán?",
  "Hợp đồng nào sắp hết hạn trong 30 ngày?",
  "Doanh thu và tỷ lệ lấp đầy tháng này",
  "Danh sách các phòng đang trống",
];

function renderMarkdown(content: string) {
  // Simple markdown renderer for AI assistant messages
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    // Header 3
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} style={{ fontSize: "0.95rem", fontWeight: 700, margin: "10px 0 4px", color: "var(--color-fg)" }}>
          {line.replace("### ", "")}
        </h4>
      );
    }
    // Blockquote
    if (line.startsWith("> ")) {
      return (
        <blockquote
          key={idx}
          style={{
            margin: "8px 0",
            padding: "6px 12px",
            borderLeft: "3px solid var(--color-primary)",
            background: "var(--color-primary-light)",
            borderRadius: "0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0",
            fontSize: "0.85rem",
            color: "var(--color-fg-2)",
          }}
        >
          {line.replace("> ", "")}
        </blockquote>
      );
    }
    // List item (level 1)
    if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} style={{ display: "flex", gap: "6px", margin: "3px 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
          <span style={{ color: "var(--color-primary)" }}>•</span>
          <div>
            {parts.map((part, pIdx) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={pIdx} style={{ color: "var(--color-fg)" }}>
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              ),
            )}
          </div>
        </div>
      );
    }
    // Sub-bullet (level 2)
    if (line.startsWith("  • ")) {
      const parts = line.replace("  • ", "").split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} style={{ display: "flex", gap: "6px", margin: "2px 0 2px 16px", fontSize: "0.835rem", color: "var(--color-fg-2)", lineHeight: 1.45 }}>
          <span>◦</span>
          <div>
            {parts.map((part, pIdx) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={pIdx} style={{ color: "var(--color-fg)" }}>
                  {part.slice(2, -2)}
                </strong>
              ) : (
                part
              ),
            )}
          </div>
        </div>
      );
    }
    // Empty line
    if (!line.trim()) {
      return <div key={idx} style={{ height: "6px" }} />;
    }
    // Standard paragraph with bold formatting
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={idx} style={{ margin: "4px 0", fontSize: "0.875rem", lineHeight: 1.5 }}>
        {parts.map((part, pIdx) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={pIdx} style={{ color: "var(--color-fg)" }}>
              {part.slice(2, -2)}
            </strong>
          ) : (
            part
          ),
        )}
      </p>
    );
  });
}

export function AiFloatingChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "welcome",
      role: "model",
      text: "👋 **Xin chào! Tôi là Trợ lý AI Quản lý Nhà trọ.**\n\nTôi có thể giúp bạn tra cứu tình trạng phòng, hợp đồng, hóa đơn còn nợ và tổng hợp báo cáo doanh thu theo thời gian thực.\n\nHãy chọn câu hỏi nhanh bên dưới hoặc nhập câu hỏi của bạn!",
      suggestions: INITIAL_SUGGESTIONS,
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Only render for staff (owner or manager)
  if (!user || (user.role !== "owner" && user.role !== "manager")) {
    return null;
  }

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatItem = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiClient<{
        reply: string;
        toolsUsed: string[];
        suggestions: string[];
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: textToSend, history }),
      });

      const modelMsg: ChatItem = {
        id: `model-${Date.now()}`,
        role: "model",
        text: res.reply,
        toolsUsed: res.toolsUsed,
        suggestions: res.suggestions,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: unknown) {
      const errMsg: ChatItem = {
        id: `err-${Date.now()}`,
        role: "model",
        text: `⚠️ **Không thể xử lý yêu cầu lúc này:** ${err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối."}\nVui lòng thử lại câu hỏi khác.`,
        suggestions: INITIAL_SUGGESTIONS,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "model",
        text: "✨ Cuộc trò chuyện đã được làm mới. Bạn cần tra cứu thông tin gì về nhà trọ?",
        suggestions: INITIAL_SUGGESTIONS,
        timestamp: new Date(),
      },
    ]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            background: "linear-gradient(135deg, #D2C3F6 0%, #B296F8 100%)",
            color: "#151026",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            borderRadius: 50,
            boxShadow: "0 10px 25px -5px rgba(210, 195, 246, 0.5), 0 0 20px rgba(210, 195, 246, 0.35)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.95rem",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          title="Mở Trợ lý AI Quản lý Nhà trọ"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(21, 16, 38, 0.12)",
              color: "#151026",
            }}
          >
            <Sparkle size={18} weight="fill" />
          </div>
          <span>Trợ lý AI</span>
          <span
            style={{
              padding: "2px 6px",
              background: "rgba(255, 255, 255, 0.25)",
              borderRadius: 10,
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.5px",
            }}
          >
            PRO
          </span>
        </motion.button>
      )}

      {/* Floating Chat Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              width: "min(420px, calc(100vw - 32px))",
              height: "min(620px, calc(100vh - 100px))",
              background: "var(--color-chat-window-bg)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid var(--color-chat-window-border)",
              borderRadius: "var(--radius-xl, 18px)",
              boxShadow: "var(--shadow-glass)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid var(--color-border-soft)",
                background: "var(--color-chat-header-bg)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #D2C3F6 0%, #A384F5 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#151026",
                    boxShadow: "0 0 14px rgba(210, 195, 246, 0.5)",
                  }}
                >
                  <Robot size={20} weight="fill" />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-fg)" }}>
                      Trợ lý AI Nhà trọ
                    </span>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#10b981",
                        boxShadow: "0 0 6px #10b981",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-fg-3)" }}>
                    Hỏi đáp tự nhiên số liệu & vận hành
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Làm mới cuộc trò chuyện"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-fg-3)",
                    padding: 6,
                    borderRadius: "var(--radius-md, 8px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <ArrowsCounterClockwise size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Thu nhỏ"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-fg-3)",
                    padding: 6,
                    borderRadius: "var(--radius-md, 8px)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <CaretDown size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "var(--color-chat-scroll-bg)",
              }}
            >
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "88%",
                        padding: isUser ? "10px 14px" : "12px 16px",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: isUser
                          ? "var(--color-chat-bubble-user-bg)"
                          : "var(--color-chat-bubble-ai-bg)",
                        color: isUser ? "var(--color-chat-bubble-user-fg)" : "var(--color-chat-bubble-ai-fg)",
                        fontWeight: isUser ? 500 : 400,
                        border: isUser ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid var(--color-chat-bubble-ai-border)",
                        backdropFilter: isUser ? undefined : "blur(12px)",
                        WebkitBackdropFilter: isUser ? undefined : "blur(12px)",
                        boxShadow: isUser
                          ? "0 4px 14px rgba(210, 195, 246, 0.3)"
                          : "0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                        wordBreak: "break-word",
                      }}
                    >
                      {isUser ? (
                        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45 }}>{m.text}</p>
                      ) : (
                        <div>
                          {renderMarkdown(m.text)}
                          {m.toolsUsed && m.toolsUsed.length > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                paddingTop: 6,
                                borderTop: "1px solid var(--color-border-soft, rgba(255,255,255,0.06))",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: "0.72rem",
                                color: "var(--color-fg-3)",
                              }}
                            >
                              <Sparkle size={12} weight="fill" color="var(--color-primary)" />
                              <span>Tra cứu qua: {m.toolsUsed.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isUser && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, paddingLeft: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, m.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-fg-3)",
                            fontSize: "0.72rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 4px",
                          }}
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={12} color="#10b981" />
                              <span style={{ color: "#10b981" }}>Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Suggestions chips */}
                    {!isUser && m.suggestions && m.suggestions.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          marginTop: "8px",
                          maxWidth: "100%",
                        }}
                      >
                        {m.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSend(sug)}
                            style={{
                              background: "var(--color-chat-chip-bg)",
                              border: "1px solid var(--color-chat-chip-border)",
                              color: "var(--color-chat-chip-fg)",
                              backdropFilter: "blur(6px)",
                              WebkitBackdropFilter: "blur(6px)",
                              borderRadius: "14px",
                              padding: "5px 11px",
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              cursor: isLoading ? "not-allowed" : "pointer",
                              textAlign: "left",
                              transition: "all 0.18s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-primary)";
                              e.currentTarget.style.background = "var(--color-chat-chip-hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--color-chat-chip-border)";
                              e.currentTarget.style.background = "var(--color-chat-chip-bg)";
                            }}
                          >
                            💡 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--color-chat-chip-bg)",
                      border: "1px solid var(--color-chat-chip-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkle size={14} className="animate-spin" color="var(--color-primary)" />
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "var(--color-fg-3)" }}>
                    AI đang trích xuất dữ liệu & soạn câu trả lời...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 14px",
                borderTop: "1px solid var(--color-border-soft)",
                background: "var(--color-chat-input-bar-bg)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hỏi về phòng, hợp đồng, hóa đơn, doanh thu..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "var(--color-input-bg)",
                  border: "1px solid var(--color-input-border)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "9px 12px",
                  fontSize: "0.88rem",
                  color: "var(--color-fg)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  background: !inputMessage.trim() || isLoading ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: !inputMessage.trim() || isLoading ? "var(--color-fg-3)" : "var(--color-on-primary)",
                  border: "none",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "9px 14px",
                  cursor: !inputMessage.trim() || isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: !inputMessage.trim() || isLoading ? "none" : "0 0 14px var(--color-primary-glow)",
                  transition: "all 0.18s ease",
                }}
                title="Gửi câu hỏi"
              >
                <PaperPlaneRight size={18} weight="fill" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
