"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";

const COMMON_ICONS = ["✅", "🎓", "📚", "💬", "🏆", "🔄", "👥", "🎯", "📱", "⚡", "🛡️", "💡", "📞", "🤝", "🌟"];

interface SupportItem {
  id: string;
  icon: string;
  title: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface Props {
  courseId: string;
  initialItems: SupportItem[];
}

export default function CourseSupportManager({ courseId, initialItems }: Props) {
  const [items, setItems]         = useState<SupportItem[]>(initialItems);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editingItem, setEditingItem] = useState<SupportItem | null>(null);
  const [form, setForm]           = useState({ icon: "✅", title: "", description: "", isActive: true });

  function openAdd() {
    setForm({ icon: "✅", title: "", description: "", isActive: true });
    setEditingItem(null);
    setShowForm(true);
  }

  function openEdit(item: SupportItem) {
    setForm({ icon: item.icon, title: item.title, description: item.description ?? "", isActive: item.isActive });
    setEditingItem(item);
    setShowForm(false);
  }

  async function saveItem() {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = {
        icon:        form.icon,
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        isActive:    form.isActive,
      };

      if (editingItem) {
        const res  = await fetch(`/api/admin/courses/${courseId}/support-items/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json() as { data?: SupportItem };
        if (json.data) {
          setItems((prev) => prev.map((i) => i.id === editingItem.id ? json.data! : i));
          setEditingItem(null);
        }
      } else {
        const res  = await fetch(`/api/admin/courses/${courseId}/support-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, displayOrder: items.length }),
        });
        const json = await res.json() as { data?: SupportItem };
        if (json.data) {
          setItems((prev) => [...prev, json.data!]);
          setShowForm(false);
        }
      }
      setForm({ icon: "✅", title: "", description: "", isActive: true });
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Xóa mục hỗ trợ này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/support-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(item: SupportItem) {
    const res  = await fetch(`/api/admin/courses/${courseId}/support-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    const json = await res.json() as { data?: SupportItem };
    if (json.data) setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isActive: !item.isActive } : i));
  }

  const ItemForm = ({ onCancel }: { onCancel: () => void }) => (
    <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] space-y-4">
      {/* Icon picker */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-2">Icon <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setForm((p) => ({ ...p, icon: ic }))}
              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-colors ${form.icon === ic ? "border-[#0066ff] bg-[#eff6ff]" : "border-[#e2e8f0] hover:border-[#0066ff]/50"}`}
            >
              {ic}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={form.icon}
          onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
          maxLength={5}
          placeholder="Hoặc nhập emoji tùy chỉnh"
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">Tiêu đề <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          placeholder="VD: Hỗ trợ 1:1 từ giảng viên"
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">Mô tả <span className="text-[#94a3b8] font-normal">(tùy chọn)</span></label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Mô tả ngắn về mục hỗ trợ này..."
          rows={2}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30 resize-none"
        />
      </div>

      {/* Active */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="support-active"
          checked={form.isActive}
          onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="support-active" className="text-xs text-[#374151]">Hiển thị trên trang khóa học</label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={saveItem}
          disabled={loading || !form.title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0066ff] text-white text-xs font-semibold rounded-lg hover:bg-[#0052cc] disabled:opacity-50 transition-colors"
        >
          <Check size={13} /> Lưu
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#e2e8f0] text-[#64748b] text-xs font-semibold rounded-lg hover:bg-[#f1f5f9] transition-colors"
        >
          <X size={13} /> Hủy
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {items.length === 0 && !showForm && (
        <p className="text-sm text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">
          Chưa có mục hỗ trợ nào. Thêm để hiển thị trong sidebar trang khóa học.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            {editingItem?.id === item.id ? (
              <ItemForm onCancel={() => setEditingItem(null)} />
            ) : (
              <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${item.isActive ? "border-[#e2e8f0] bg-white" : "border-[#f1f5f9] bg-[#f8fafc] opacity-60"}`}>
                <GripVertical size={14} className="text-[#cbd5e1] shrink-0 mt-1" />
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a]">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-[#64748b] mt-0.5">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => void toggleActive(item)} title={item.isActive ? "Ẩn" : "Hiện"} className="p-1 text-[#64748b] hover:text-[#0066ff]">
                    {item.isActive ? <Check size={13} className="text-[#16a34a]" /> : <X size={13} />}
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="p-1 text-[#64748b] hover:text-[#0066ff]"><Pencil size={13} /></button>
                  <button type="button" onClick={() => void deleteItem(item.id)} className="p-1 text-[#64748b] hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && <ItemForm onCancel={() => setShowForm(false)} />}

      {!showForm && (
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-dashed border-[#0066ff]/40 text-[#0066ff] text-sm font-semibold rounded-xl hover:bg-[#eff6ff] transition-colors"
        >
          <Plus size={14} /> Thêm mục hỗ trợ
        </button>
      )}
    </div>
  );
}
