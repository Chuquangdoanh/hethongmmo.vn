"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { r2Url } from "@/lib/utils/image-url";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Staff {
  id: string;
  category: string;
  name: string;
  role: string;
  description: string | null;
  avatarUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface Props {
  categories: string[];
  initialStaff: Staff[];
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

function SortableRow({
  s, onEdit, onDelete, onToggle, loading,
}: {
  s: Staff;
  onEdit: (s: Staff) => void;
  onDelete: (id: string, name: string) => void;
  onToggle: (s: Staff) => void;
  loading: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDragging ? "bg-violet-50 shadow-md z-10 relative" : "hover:bg-gray-50"}`}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0 touch-none">
        <GripVertical size={15} />
      </button>
      <div className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
        {s.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r2Url(s.avatarUrl)} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-base">👤</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {s.name}
          {!s.isActive && <span className="ml-2 text-[10px] font-medium text-gray-400">(đã ẩn)</span>}
        </p>
        <p className="text-[11px] text-[#7C3AED] truncate">{s.role}</p>
        {s.description && <p className="text-[10px] text-gray-400 truncate">{s.description}</p>}
      </div>
      <div className="flex gap-3 shrink-0">
        <button type="button" onClick={() => onToggle(s)} disabled={loading} className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors">
          {s.isActive ? "Ẩn" : "Hiện"}
        </button>
        <button type="button" onClick={() => onEdit(s)} className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors">
          Sửa
        </button>
        <button type="button" onClick={() => onDelete(s.id, s.name)} disabled={loading} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
          Xóa
        </button>
      </div>
    </li>
  );
}

export default function CategoryStaffManager({ categories, initialStaff }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] ?? "");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const visibleStaff = useMemo(
    () => staff
      .filter((s) => s.category === selectedCategory)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    [staff, selectedCategory],
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setRole("");
    setDescription("");
    setAvatarUrl("");
    setError("");
    setUploadError("");
  }

  function startEdit(s: Staff) {
    setEditingId(s.id);
    setSelectedCategory(s.category);
    setName(s.name);
    setRole(s.role);
    setDescription(s.description ?? "");
    setAvatarUrl(s.avatarUrl ?? "");
    setError("");
    setUploadError("");
  }

  async function handleSave() {
    if (!selectedCategory) { setError("Vui lòng chọn danh mục"); return; }
    if (!name.trim()) { setError("Tên nhân sự không được để trống"); return; }
    if (!role.trim()) { setError("Chức vụ không được để trống"); return; }
    setError("");
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/category-staff/${editingId}` : "/api/admin/category-staff";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          name: name.trim(),
          role: role.trim(),
          description: description.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });
      const json = (await res.json()) as { data?: Staff; error?: string };
      if (!res.ok) { setError(json.error ?? "Lưu thất bại"); return; }
      if (editingId) {
        setStaff((prev) => prev.map((s) => s.id === editingId ? (json.data ?? s) : s));
      } else {
        setStaff((prev) => [...prev, json.data!]);
      }
      router.refresh();
      resetForm();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, staffName: string) {
    if (!confirm(`Xóa nhân sự "${staffName}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/category-staff/${id}`, { credentials: "include", method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { setError(json.error ?? "Xóa thất bại"); return; }
      setStaff((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(s: Staff) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/category-staff/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      const json = (await res.json()) as { data?: Staff; error?: string };
      if (!res.ok) { setError(json.error ?? "Cập nhật thất bại"); return; }
      setStaff((prev) => prev.map((x) => x.id === s.id ? (json.data ?? x) : x));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(file.type)) { setUploadError("Chỉ chấp nhận JPG, PNG, WebP, GIF, SVG"); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("File quá lớn, tối đa 5 MB"); return; }
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload/thumbnail?type=staff-avatar", { credentials: "include", method: "POST", body: fd });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Upload thất bại"); return; }
      setAvatarUrl(json.data?.url ?? "");
    } finally {
      setUploading(false);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleStaff.findIndex((s) => s.id === active.id);
    const newIndex = visibleStaff.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(visibleStaff, oldIndex, newIndex).map((s, i) => ({ ...s, displayOrder: i + 1 }));

    setStaff((prev) => prev.map((s) => reordered.find((r) => r.id === s.id) ?? s));

    setReordering(true);
    try {
      await fetch("/api/admin/category-staff/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered.map(({ id, displayOrder }) => ({ id, displayOrder })) }),
      });
      router.refresh();
    } finally {
      setReordering(false);
    }
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Chưa có danh mục dịch vụ nào. Vui lòng tạo danh mục ở trang{" "}
        <a href="/admin/service-categories" className="font-semibold underline">DM Dịch vụ</a>{" "}trước.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
      {/* ── Cột trái: Form thêm / sửa (6/10) ── */}
      <div className="lg:col-span-6">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            {editingId ? "Sửa nhân sự" : "Thêm nhân sự mới"}
          </h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Danh mục *</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); if (editingId) resetForm(); }}
              className={inputCls}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tên nhân sự *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="vd: Nguyễn Văn A" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Chức vụ *</label>
              <input type="text" value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="vd: Trưởng nhóm hỗ trợ" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Mô tả</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Mô tả ngắn về nhân sự..." className={`${inputCls} resize-none`} />
          </div>

          {avatarUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(avatarUrl)} alt="avatar preview" className="w-12 h-12 object-cover rounded-full border border-gray-200 bg-gray-50 shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-xs text-gray-500 truncate">{avatarUrl}</p></div>
              <button type="button" onClick={() => setAvatarUrl("")} className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">Xóa</button>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Ảnh đại diện</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-5 ${
                isDragOver ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 hover:border-[#7C3AED]/50"
              }`}
            >
              {uploading ? <p className="text-xs text-gray-500">Đang upload...</p> : (
                <>
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-xs text-gray-400">Kéo thả hoặc click để chọn ảnh (JPG, PNG, WebP, SVG, GIF)</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleFileChange} />
          </div>

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => void handleSave()} disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#A855F7] disabled:opacity-60 transition-colors">
              {loading ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm nhân sự"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-100 transition-colors">
                Hủy
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Cột phải: Danh sách theo danh mục (4/10) ── */}
      <div className="lg:col-span-4 lg:sticky lg:top-4">
        <section className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {selectedCategory || "—"} ({visibleStaff.length})
            </p>
            {reordering && <span className="text-[10px] text-violet-500 animate-pulse">Đang lưu...</span>}
          </div>
          {visibleStaff.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Chưa có nhân sự cho danh mục này</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
              <SortableContext items={visibleStaff.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-gray-100">
                  {visibleStaff.map((s) => (
                    <SortableRow key={s.id} s={s} onEdit={startEdit} onDelete={handleDelete} onToggle={handleToggle} loading={loading} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>
    </div>
  );
}
