"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIdx((prev) => (prev === i ? null : i));

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "14px", maxWidth: "1000px", margin: "0 auto" }}
      className="faq-grid-responsive"
    >
      {items.map(({ q, a }, i) => {
        const isOpen = openIdx === i;
        return (
          <div
            key={i}
            className="anim-fade-up"
            data-d={String((i % 3) + 1)}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: isOpen
                ? "1.5px solid #00f5d4"
                : "1.5px solid #e2e8f0",
              overflow: "hidden",
              cursor: "pointer",
              transition: "border-color .3s ease, box-shadow .3s ease",
              boxShadow: isOpen
                ? "0 0 0 3px rgba(0,245,212,.1),0 8px 24px rgba(0,0,0,.06)"
                : "none",
            }}
            onClick={() => toggle(i)}
          >
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 22px",
              fontWeight: "700",
              fontSize: ".95rem",
              gap: "12px",
              color: "#0f172a",
            }}>
              <span>{q}</span>
              <span style={{
                flexShrink: 0,
                width: "30px", height: "30px",
                borderRadius: "8px",
                background: isOpen ? "#0066ff" : "rgba(0,102,255,.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: isOpen ? "#fff" : "#0066ff",
                fontSize: ".85rem",
                transition: "transform .3s ease, background .3s ease",
                transform: isOpen ? "rotate(45deg)" : "none",
              }}>
                +
              </span>
            </div>

            {/* Body */}
            <div style={{
              maxHeight: isOpen ? "200px" : "0",
              overflow: "hidden",
              opacity: isOpen ? 1 : 0,
              padding: isOpen ? "0 22px 20px" : "0 22px",
              transition: "max-height .4s cubic-bezier(0.4,0,0.2,1), opacity .3s ease, padding .3s ease",
              color: "#64748b",
              fontSize: ".92rem",
              lineHeight: "1.75",
            }}>
              {a}
            </div>
          </div>
        );
      })}

      <style>{`
        .faq-grid-responsive { grid-template-columns: repeat(2,1fr); }
        @media (max-width: 768px) {
          .faq-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
