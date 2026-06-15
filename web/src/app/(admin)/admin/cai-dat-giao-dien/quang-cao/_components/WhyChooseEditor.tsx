"use client";
import { useState } from "react";
import { ImageUpload } from "../../_components/ImageUpload";

interface StatItem { value: string; label: string }

interface Props {
  sectionKey: string;
  initialData: Record<string, unknown>;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => (typeof item === "string" ? item : String(item ?? "")));
}

function asStatArray(v: unknown): StatItem[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((item) => {
    if (item && typeof item === "object" && "value" in item && "label" in item) {
      const o = item as Record<string, unknown>;
      return [{ value: String(o["value"] ?? ""), label: String(o["label"] ?? "") }];
    }
    return [];
  });
}

export default function WhyChooseEditor({ sectionKey, initialData }: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const bullets = asStringArray(data["bullets"]);
  const stats = asStatArray(data["stats"]);

  function setField(field: string, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function setBullet(index: number, value: string) {
    const next = [...bullets];
    next[index] = value;
    setField("bullets", next);
  }
  function addBullet() { setField("bullets", [...bullets, ""]); }
  function removeBullet(index: number) { setField("bullets", bullets.filter((_, i) => i !== index)); }

  function setStat(index: number, key: keyof StatItem, value: string) {
    setField("stats", stats.map((s, i) => i === index ? { ...s, [key]: value } : s));
  }
  function addStat() { setField("stats", [...stats, { value: "", label: "" }]); }
  function removeStat(index: number) { setField("stats", stats.filter((_, i) => i !== index)); }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sectionKey, content: data }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Lỗi lưu");
      setMsg({ type: "ok", text: "Đã lưu!" });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-800">Lý do chọn chúng tôi</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Section bên dưới dịch vụ — trang{" "}
            <code className="bg-gray-100 px-1 rounded">/quang-cao</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span className={`text-xs font-medium ${msg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {msg.text}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Section label */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Label section
          </label>
          <input
            type="text"
            value={String(data["sectionLabel"] ?? "")}
            onChange={(e) => setField("sectionLabel", e.target.value)}
            placeholder="VD: Lý do chọn chúng tôi"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Subtitle
          </label>
          <input
            type="text"
            value={String(data["subtitle"] ?? "")}
            onChange={(e) => setField("subtitle", e.target.value)}
            placeholder="VD: Chất lượng tạo nên uy tín"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bullet points */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Lý do (bullet points)
          </label>
          <div className="space-y-2">
            {bullets.map((bullet, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => setBullet(i, e.target.value)}
                  placeholder={`Lý do ${i + 1}`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeBullet(i)}
                  className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBullet}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Thêm lý do
          </button>
        </div>

        {/* Stats background image */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ảnh nền card thống kê</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Ảnh mờ hiển thị phía dưới các số liệu (50B+, 1.200+, 350%). Để trống = dùng ảnh hero.</p>
          </div>
          <ImageUpload
            label=""
            value={String(data["statsBgImage"] ?? "")}
            onChange={(url) => setField("statsBgImage", url)}
            uploadType="cms-page"
            hint="Ảnh sẽ được làm mờ 50% — nên chọn ảnh có nhiều chi tiết, tông sáng."
          />
        </div>

        {/* Stats */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Thống kê (stats)
          </label>
          <div className="space-y-2">
            {stats.map((stat, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={stat.value}
                  onChange={(e) => setStat(i, "value", e.target.value)}
                  placeholder="VD: 50B+"
                  className="w-28 shrink-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={stat.label}
                  onChange={(e) => setStat(i, "label", e.target.value)}
                  placeholder="VD: NGÂN SÁCH ĐÃ QUẢN LÝ"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeStat(i)}
                  className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addStat}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Thêm thống kê
          </button>
        </div>
      </div>
    </div>
  );
}
