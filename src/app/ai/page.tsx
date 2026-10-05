"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkle,
  PaperPlaneRight,
  ArrowsCounterClockwise,
  Robot,
  Copy,
  Check,
  Buildings,
  Receipt,
  FileText,
  ChartBar,
  Wrench,
  Users,
} from "@phosphor-icons/react";
import { AppHeader } from "../../components/layout/app-header";
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

const TEMPLATE_CATEGORIES = [
  {
    icon: Receipt,
    label: "Công nợ & Hóa đơn",
    queries: [
      "Tháng này có bao nhiêu phòng chưa thanh toán?",
      "Tổng số tiền nợ hiện tại là bao nhiêu?",
      "Phòng nào có hóa đơn quá hạn?",
    ],
  },
  {
    icon: Buildings,
    label: "Phòng & Lấp đầy",
    queries: [
      "Danh sách các phòng đang trống hiện tại",
      "Phòng 101 tình trạng thế nào?",
      "Tỷ lệ lấp đầy phòng tháng này",
    ],
  },
  {
    icon: FileText,
    label: "Hợp đồng & Đáo hạn",
    queries: [
      "Hợp đồng nào sắp hết hạn trong 30 ngày?",
      "Hợp đồng phòng 101 còn bao nhiêu ngày?",
      "Hợp đồng nào sắp hết hạn trong 7 ngày tới?",
    ],
  },
  {
    icon: ChartBar,
    label: "Doanh thu & Tiện ích",
    queries: [
      "Doanh thu tháng này là bao nhiêu?",
      "Báo cáo tổng quan vận hành tháng này",
      "Tiêu thụ điện nước tháng này thế nào?",
    ],
  },
  {
    icon: Wrench,
    label: "Sự cố & Bảo trì",
    queries: [
      "Có sự cố sửa chữa nào chưa giải quyết không?",
      "Danh sách báo hỏng hóc thiết bị",
    ],
  },
  {
    icon: Users,
    label: "Khách thuê",
    queries: [
      "Danh bạ khách thuê đang ở trọ",
      "Tìm khách thuê theo phòng",
    ],
  },
];

function renderMarkdown(content: string) {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return (
        <h4 key={idx} style={{ fontSize: "1rem", fontWeight: 700, margin: "12px 0 6px", color: "var(--color-fg)" }}>
          {line.replace("### ", "")}
        </h4>
      );
    }
    if (line.startsWith("> ")) {
      return (
        <blockquote
          key={idx}
          style={{
            margin: "10px 0",
            padding: "8px 14px",
            borderLeft: "3px solid var(--color-primary)",
            background: "var(--color-primary-light)",
            borderRadius: "0 var(--radius-sm, 4px) var(--radius-sm, 4px) 0",
            fontSize: "0.88rem",
            color: "var(--color-fg-2)",
          }}
        >
          {line.replace("> ", "")}
        </blockquote>
      );
    }
    if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} style={{ display: "flex", gap: "8px", margin: "4px 0", fontSize: "0.92rem", lineHeight: 1.55 }}>
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
    if (line.startsWith("  • ")) {
      const parts = line.replace("  • ", "").split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} style={{ display: "flex", gap: "8px", margin: "3px 0 3px 20px", fontSize: "0.875rem", color: "var(--color-fg-2)", lineHeight: 1.5 }}>
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
    if (!line.trim()) {
      return <div key={idx} style={{ height: "8px" }} />;
    }
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={idx} style={{ margin: "6px 0", fontSize: "0.92rem", lineHeight: 1.6 }}>
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

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "init",
      role: "model",
      text: "👋 **Xin chào! Tôi là Trợ lý AI Vận hành Nhà trọ.**\n\nTôi được kết nối trực tiếp với hệ thống quản lý để cung cấp câu trả lời chính xác theo thời gian thực về phòng trọ, khách thuê, hợp đồng, hóa đơn và doanh thu.\n\nBạn có thể nhấp vào một trong các câu hỏi mẫu ở cột bên trái hoặc tự do gõ câu hỏi của mình!",
      suggestions: [
        "Tháng này có bao nhiêu phòng chưa thanh toán?",
        "Hợp đồng nào sắp hết hạn trong 30 ngày?",
        "Danh sách các phòng đang trống",
      ],
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: ChatItem = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "init")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiClient<{
        reply: string;
        toolsUsed: string[];
        suggestions: string[];
      }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: query, history }),
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
        text: `⚠️ **Không thể xử lý yêu cầu lúc này:** ${err instanceof Error ? err.message : "Đã xảy ra lỗi kết nối."}\nVui lòng thử lại.`,
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
        id: "reset",
        role: "model",
        text: "✨ Cuộc trò chuyện đã được làm mới. Hãy nhập câu hỏi để bắt đầu!",
        suggestions: [
          "Tháng này có bao nhiêu phòng chưa thanh toán?",
          "Hợp đồng nào sắp hết hạn trong 30 ngày?",
          "Doanh thu và tỷ lệ lấp đầy tháng này",
        ],
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
    <div className="app-shell">
      <AppHeader />
      <main className="main-container" style={{ paddingBottom: 40 }}>
        {/* Header bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-lg, 12px)",
                  background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                }}
              >
                <Sparkle size={22} weight="fill" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "var(--color-fg)" }}>
                  Trợ lý AI Quản lý Nhà trọ
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-fg-3)" }}>
                  Truy vấn ngôn ngữ tự nhiên kết hợp Gemini Function Calling & trích xuất dữ liệu vận hành thời gian thực
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-fg-2)",
              padding: "8px 14px",
              borderRadius: "var(--radius-md, 8px)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowsCounterClockwise size={16} />
            <span>Làm mới hội thoại</span>
          </button>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 20,
            alignItems: "stretch",
            height: "calc(100vh - 210px)",
            minHeight: 560,
          }}
        >
          {/* Left Column: Quick Query Templates */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl, 16px)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              gap: 16,
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-fg-2)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              💡 Mẫu câu hỏi nhanh
            </div>

            {TEMPLATE_CATEGORIES.map((cat, cIdx) => {
              const IconComp = cat.icon;
              return (
                <div key={cIdx} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--color-primary)" }}>
                    <IconComp size={15} weight="bold" />
                    <span>{cat.label}</span>
                  </div>
                  {cat.queries.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSend(q)}
                      style={{
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border-soft, rgba(255,255,255,0.06))",
                        color: "var(--color-fg-2)",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-md, 8px)",
                        fontSize: "0.82rem",
                        textAlign: "left",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        lineHeight: 1.4,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-primary)";
                        e.currentTarget.style.color = "var(--color-fg)";
                        e.currentTarget.style.background = "var(--color-primary-light)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border-soft, rgba(255,255,255,0.06))";
                        e.currentTarget.style.color = "var(--color-fg-2)";
                        e.currentTarget.style.background = "var(--color-surface-2)";
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Right Column: Interactive Chat Stream */}
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-xl, 16px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                background: "var(--color-bg)",
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
                        maxWidth: "85%",
                        padding: isUser ? "12px 18px" : "16px 20px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isUser
                          ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                          : "var(--color-surface)",
                        color: isUser ? "#ffffff" : "var(--color-fg)",
                        border: isUser ? "none" : "1px solid var(--color-border)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                        wordBreak: "break-word",
                      }}
                    >
                      {isUser ? (
                        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>{m.text}</p>
                      ) : (
                        <div>
                          {renderMarkdown(m.text)}
                          {m.toolsUsed && m.toolsUsed.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 8,
                                borderTop: "1px solid var(--color-border-soft, rgba(255,255,255,0.06))",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: "0.78rem",
                                color: "var(--color-fg-3)",
                              }}
                            >
                              <Sparkle size={13} weight="fill" color="var(--color-primary)" />
                              <span>Công cụ đã gọi: <strong>{m.toolsUsed.join(", ")}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!isUser && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, paddingLeft: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, m.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-fg-3)",
                            fontSize: "0.76rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={14} color="#10b981" />
                              <span style={{ color: "#10b981" }}>Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Sao chép kết quả</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {!isUser && m.suggestions && m.suggestions.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          marginTop: "10px",
                          maxWidth: "85%",
                        }}
                      >
                        {m.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSend(sug)}
                            style={{
                              background: "var(--color-surface-2)",
                              border: "1px solid var(--color-border)",
                              color: "var(--color-primary)",
                              borderRadius: "16px",
                              padding: "5px 12px",
                              fontSize: "0.82rem",
                              cursor: isLoading ? "not-allowed" : "pointer",
                              transition: "all 0.15s ease",
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--color-primary-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkle size={16} className="animate-spin" color="var(--color-primary)" />
                  </div>
                  <span style={{ fontSize: "0.88rem", color: "var(--color-fg-3)" }}>
                    AI đang tra cứu dữ liệu & xử lý câu trả lời...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 20px",
                borderTop: "1px solid var(--color-border)",
                background: "var(--color-surface-2)",
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hỏi bất kỳ điều gì: phòng nào nợ tiền, hợp đồng nào sắp hết hạn, tổng doanh thu..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg, 10px)",
                  padding: "12px 16px",
                  fontSize: "0.95rem",
                  color: "var(--color-fg)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  background: !inputMessage.trim() || isLoading ? "var(--color-surface-3)" : "var(--color-primary)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-lg, 10px)",
                  padding: "12px 20px",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  cursor: !inputMessage.trim() || isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>Gửi</span>
                <PaperPlaneRight size={18} weight="fill" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
