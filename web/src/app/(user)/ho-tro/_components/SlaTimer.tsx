"use client";

import { useState, useEffect } from "react";

interface Props {
  startAt: string;
  durationMinutes: number;
}

export default function SlaTimer({ startAt, durationMinutes }: Props) {
  const [remaining, setRemaining] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function calc() {
      const end = new Date(startAt).getTime() + durationMinutes * 60 * 1000;
      setRemaining(Math.max(0, end - Date.now()));
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [startAt, durationMinutes]);

  if (!mounted) return null;

  const hours   = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  const isExpired = remaining === 0;
  const pct = Math.min(100, ((durationMinutes * 60 * 1000 - remaining) / (durationMinutes * 60 * 1000)) * 100);

  const startMs   = new Date(startAt).getTime();
  const milestones = [
    { min: 15, label: "Đã gửi khiếu nại SLA 1",       warn: false, auto: false },
    { min: 30, label: "Đã gửi khiếu nại SLA 2",        warn: false, auto: false },
    { min: 45, label: "Sắp hết thời gian phản hồi",    warn: true,  auto: false },
    { min: 60, label: "Tự động chuyển hoàn tiền",       warn: false, auto: true  },
  ].map(m => ({
    ...m,
    time: new Date(startMs + m.min * 60 * 1000),
    passed: Date.now() > startMs + m.min * 60 * 1000,
  }));

  return (
    <div className={isExpired ? "ht-sla-expired" : ""}>
      {/* Countdown */}
      <div className="ht-sla-countdown">
        <div className="ht-sla-digit">
          <div className="ht-sla-digit-val">{hours.toString().padStart(2, "0")}</div>
          <div className="ht-sla-digit-unit">giờ</div>
        </div>
        <div className="ht-sla-sep">:</div>
        <div className="ht-sla-digit">
          <div className="ht-sla-digit-val">{minutes.toString().padStart(2, "0")}</div>
          <div className="ht-sla-digit-unit">phút</div>
        </div>
        <div className="ht-sla-sep">:</div>
        <div className="ht-sla-digit">
          <div className="ht-sla-digit-val">{seconds.toString().padStart(2, "0")}</div>
          <div className="ht-sla-digit-unit">giây</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", background: "#fee2e2", borderRadius: "4px", marginBottom: "14px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: isExpired ? "#94a3b8" : pct > 75 ? "#dc2626" : pct > 50 ? "#f59e0b" : "#2563eb",
          borderRadius: "4px",
          transition: "width 1s linear",
        }} />
      </div>

      {isExpired && (
        <p style={{ fontSize: "11px", color: "#dc2626", fontWeight: "600", textAlign: "center", marginBottom: "12px" }}>
          Đã hết thời gian SLA — đang xử lý tự động
        </p>
      )}

      {/* Timeline */}
      <div className="ht-sla-timeline">
        {milestones.map(m => (
          <div key={m.min} className="ht-sla-timeline-item">
            <div className={`ht-sla-dot${m.passed ? (m.auto ? " ht-sla-dot--auto" : m.warn ? " ht-sla-dot--warn" : " ht-sla-dot--passed") : ""}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "10px",
                fontWeight: m.passed ? "600" : "400",
                color: m.passed ? (m.warn ? "#dc2626" : "#374151") : "#9ca3af",
                margin: 0,
              }}>
                {m.min} phút
                {m.passed && (
                  <span style={{ color: "#94a3b8", fontWeight: "400" }}>
                    {" · "}{m.time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </p>
              <p style={{
                fontSize: "9px",
                color: m.warn && m.passed ? "#dc2626" : "#9ca3af",
                margin: "1px 0 0",
              }}>
                {m.warn && m.passed ? "⚠️ " : ""}{m.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "12px", lineHeight: "1.5" }}>
        Seller cần phản hồi trong {durationMinutes} phút kể từ khi bạn mở khiếu nại
      </p>
    </div>
  );
}
