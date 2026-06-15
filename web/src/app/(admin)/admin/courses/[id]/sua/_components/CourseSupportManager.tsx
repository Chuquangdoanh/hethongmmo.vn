"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import { COURSE_SUPPORT_ICONS, CourseIcon } from "@/lib/utils/course-icons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SupportItem {
  id: string;
  icon: string;
  title: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface SupportFormValues {
  icon: string;
  title: string;
  description: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SupportForm — tách ra ngoài để tránh unmount/remount khi parent re-render
// ─────────────────────────────────────────────────────────────────────────────

interface SupportFormProps {
  initialValues: SupportFormValues;
  saving: boolean;
  onSave: (data: { icon: string; title: string; description: string | undefined; isActive: boolean }) => void;
  onCancel: () => void;
}

function SupportForm({ initialValues, saving, onSave, onCancel }: SupportFormProps) {
  const [icon, setIcon]               = useState(initialValues.icon || COURSE_SUPPORT_ICONS[0]!.name);
  const [title, setTitle]             = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [isActive, setIsActive]       = useState(initialValues.isActive);

  function handleSave() {
    if (!title.trim()) return;
    onSave({ icon, title: title.trim(), description: description.trim() || undefined, isActive });
  }

  return (
    <div className="border border-[#e2e8f0] rounded-xl p-5 bg-[#f8fafc] space-y-4">

      {/* Icon picker */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-2">
          Icon <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-8 gap-1.5 mb-3">
          {COURSE_SUPPORT_ICONS.map(({ name, label, Icon }) => (
            <button
              key={name}
              type="button"
              title={label}
              onClick={() => setIcon(name)}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all ${
                icon === name
                  ? "border-[#0066ff] bg-[#eff6ff] text-[#0066ff]"
                  : "border-[#e2e8f0] hover:border-[#0066ff]/50 text-[#64748b] hover:text-[#0066ff]"
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
        {/* Preview icon đang chọn */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg w-fit">
          <CourseIcon name={icon} size={18} className="text-[#0066ff]" />
          <span className="text-xs text-[#374151]">
            {COURSE_SUPPORT_ICONS.find((i) => i.name === icon)?.label ?? icon}
          </span>
        </div>
      </div>

      {/* Tiêu đề */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">
          Tiêu đề <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Hỗ trợ 1:1 từ giảng viên"
          autoFocus
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30"
        />
      </div>

      {/* Mô tả */}
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">
          Mô tả <span className="text-[#94a3b8] font-normal">(tùy chọn)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="support-active" className="text-xs text-[#374151]">
          Hiển thị trên trang khóa học
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim()}
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
}

// ─────────────────────────────────────────────────────────────────────────────
// CourseSupportManager
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  initialItems: SupportItem[];
}

export default function CourseSupportManager({ courseId, initialItems }: Props) {
  const [items, setItems]             = useState<SupportItem[]>(initialItems);
  const [loading, setLoading]         = useState(false);
  const [formKey, setFormKey]         = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<SupportItem | null>(null);
  const [initVal, setInitVal]         = useState<SupportFormValues>({
    icon: COURSE_SUPPORT_ICONS[0]!.name, title: "", description: "", isActive: true,
  });

  function openAdd() {
    setEditingItem(null);
    setInitVal({ icon: COURSE_SUPPORT_ICONS[0]!.name, title: "", description: "", isActive: true });
    setFormKey("add");
  }

  function openEdit(item: SupportItem) {
    setEditingItem(item);
    setInitVal({ icon: item.icon, title: item.title, description: item.description ?? "", isActive: item.isActive });
    setFormKey(`edit-${item.id}`);
  }

  function closeForm() {
    setFormKey(null);
    setEditingItem(null);
  }

  async function saveItem(data: { icon: string; title: string; description: string | undefined; isActive: boolean }) {
    setLoading(true);
    try {
      if (editingItem) {
        const res  = await fetch(`/api/admin/courses/${courseId}/support-items/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json() as { data?: SupportItem };
        if (json.data) {
          setItems((prev) => prev.map((i) => i.id === editingItem.id ? json.data! : i));
          closeForm();
        }
      } else {
        const res  = await fetch(`/api/admin/courses/${courseId}/support-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, displayOrder: items.length }),
        });
        const json = await res.json() as { data?: SupportItem };
        if (json.data) {
          setItems((prev) => [...prev, json.data!]);
          closeForm();
        }
      }
    } finally { setLoading(false); }
  }

  async function deleteItem(id: string) {
    if (!confirm("Xóa mục hỗ trợ này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/support-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingItem?.id === id) closeForm();
    } finally { setLoading(false); }
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

  return (
    <div className="space-y-3">
      {items.length === 0 && !formKey && (
        <p className="text-sm text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">
          Chưa có mục hỗ trợ nào. Thêm để hiển thị trong sidebar trang khóa học.
        </p>
      )}

      {items.map((item) => (
        <div key={item.id}>
          {formKey === `edit-${item.id}` ? (
            <SupportForm
              key={formKey}
              initialValues={initVal}
              saving={loading}
              onSave={(d) => void saveItem(d)}
              onCancel={closeForm}
            />
          ) : (
            <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${item.isActive ? "border-[#e2e8f0] bg-white" : "border-[#f1f5f9] bg-[#f8fafc] opacity-60"}`}>
              <GripVertical size={14} className="text-[#cbd5e1] shrink-0" />
              <div className="w-9 h-9 rounded-lg bg-[#eff6ff] flex items-center justify-center shrink-0">
                <CourseIcon name={item.icon} size={18} className="text-[#0066ff]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0f172a] leading-snug">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-[#64748b] mt-0.5 truncate">{item.description}</p>
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

      {formKey === "add" && (
        <SupportForm
          key={formKey}
          initialValues={initVal}
          saving={loading}
          onSave={(d) => void saveItem(d)}
          onCancel={closeForm}
        />
      )}

      {!formKey && (
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
