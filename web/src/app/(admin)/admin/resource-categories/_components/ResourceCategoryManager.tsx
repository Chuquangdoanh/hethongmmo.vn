"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { r2Url } from "@/lib/utils/image-url";
import { FolderOpen, Warehouse, Package, Wrench, GripVertical, X, AlertTriangle, Search } from "lucide-react";
import { toast } from "@/components/shared/Toaster";
import SubCategoryManager from "./SubCategoryManager";

const SVGL_PRESETS = [
  { name: "Facebook",    icon: "https://svgl.app/library/facebook-icon.svg" },
  { name: "TikTok",      icon: "https://svgl.app/library/tiktok-icon-light.svg" },
  { name: "YouTube",     icon: "https://svgl.app/library/youtube.svg" },
  { name: "Instagram",   icon: "https://svgl.app/library/instagram-icon.svg" },
  { name: "X (Twitter)", icon: "https://svgl.app/library/x.svg" },
  { name: "Telegram",    icon: "https://svgl.app/library/telegram.svg" },
  { name: "WhatsApp",    icon: "https://svgl.app/library/whatsapp-icon.svg" },
  { name: "Pinterest",   icon: "https://svgl.app/library/pinterest.svg" },
  { name: "Reddit",      icon: "https://svgl.app/library/reddit.svg" },
  { name: "LinkedIn",    icon: "https://svgl.app/library/linkedin.svg" },
  { name: "Google",      icon: "https://svgl.app/library/google.svg" },
  { name: "Shopify",     icon: "https://svgl.app/library/shopify.svg" },
  { name: "WordPress",   icon: "https://svgl.app/library/wordpress.svg" },
  { name: "Figma",       icon: "https://svgl.app/library/figma.svg" },
  { name: "Canva",       icon: "https://svgl.app/library/canva.svg" },
  { name: "Notion",      icon: "https://svgl.app/library/notion.svg" },
  { name: "Discord",     icon: "https://svgl.app/library/discord.svg" },
  { name: "Twitch",      icon: "https://svgl.app/library/twitch.svg" },
];

interface SubCategory {
  id: string;
  name: string;
  categoryName: string;
  displayOrder: number;
  isActive: boolean;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
  showInToolPhanMem: boolean;
}

interface Category {
  id: string;
  name: string;
  iconUrl: string | null;
  displayOrder: number;
  showInKhoTaiNguyen: boolean;
  showInTaiNguyenMmo: boolean;
  showInToolPhanMem: boolean;
  _count: { subCategories: number };
  subCategories: SubCategory[];
}

interface Props {
  initialCategories: Category[];
}

// Kho Tài Nguyên đã gộp chung với Nguyên Liệu MMO ở trang public (/tai-nguyen-mmo) — chỉ còn 2 khu vực quản lý
type StoreFilter = "nguyen-lieu" | "tool";
type CategoryFlags = { showInKhoTaiNguyen: boolean; showInTaiNguyenMmo: boolean; showInToolPhanMem: boolean };

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#7C3AED] focus:outline-none";

const STORE_META: Record<StoreFilter, { label: string; Icon: typeof Warehouse; badgeClass: string; solidClass: string; textClass: string; fields: (keyof CategoryFlags)[] }> = {
  "nguyen-lieu": { label: "Nguyên Liệu MMO",  Icon: Package, badgeClass: "bg-violet-100 text-violet-700", solidClass: "bg-violet-600 hover:bg-violet-700", textClass: "text-violet-700", fields: ["showInTaiNguyenMmo", "showInKhoTaiNguyen"] },
  tool:          { label: "Tool - Phần mềm", Icon: Wrench,  badgeClass: "bg-amber-100 text-amber-700",  solidClass: "bg-amber-600 hover:bg-amber-700",  textClass: "text-amber-700",  fields: ["showInToolPhanMem"] },
};

function storeMatches(cat: CategoryFlags, k: StoreFilter): boolean {
  return STORE_META[k].fields.some((f) => cat[f]);
}

// ── Store badge (read-only) ───────────────────────────────────────────────────
function StoreBadge({ cat }: { cat: CategoryFlags }) {
  const active = (Object.keys(STORE_META) as StoreFilter[]).filter((k) => storeMatches(cat, k));
  if (active.length === 0) return null;
  if (active.length > 1) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
        {active.map((k) => { const Icon = STORE_META[k].Icon; return <Icon key={k} size={9} />; })} {active.length} khu vực
      </span>
    );
  }
  const only = STORE_META[active[0]!];
  const Icon = only.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${only.badgeClass}`}>
      <Icon size={9} /> {only.label}
    </span>
  );
}

// ── Drawer (slide-in từ phải) ─────────────────────────────────────────────────
function Drawer({
  open, onClose, title, headerClass = "bg-gray-50 border-gray-200", children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerClass?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-0 top-0 h-full w-full sm:max-w-120 bg-white z-50 shadow-2xl flex flex-col">
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${headerClass}`}>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Modal xác nhận xóa ────────────────────────────────────────────────────────
function DeleteModal({
  cat, storeFilter, onConfirm, onCancel, loading,
}: {
  cat: Category;
  storeFilter: StoreFilter;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const childCount = cat._count.subCategories;
  // Nếu danh mục thuộc nhiều hơn 1 khu vực → chỉ gỡ khỏi khu vực hiện tại, không xóa hẳn
  const activeStores = (Object.keys(STORE_META) as StoreFilter[]).filter((k) => storeMatches(cat, k));
  const isInBothKhos = activeStores.length > 1;
  const currentStoreName = STORE_META[storeFilter].label;
  const otherStoreName = activeStores.filter((k) => k !== storeFilter).map((k) => STORE_META[k].label).join(", ");

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-60 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isInBothKhos ? "bg-amber-100" : "bg-red-100"}`}>
            <AlertTriangle size={18} className={isInBothKhos ? "text-amber-600" : "text-red-600"} />
          </div>
          <div className="flex-1">
            {isInBothKhos ? (
              <>
                <h3 className="text-sm font-semibold text-gray-900">
                  Gỡ khỏi {currentStoreName}?
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">"{cat.name}"</span> sẽ bị gỡ khỏi{" "}
                  <strong>{currentStoreName}</strong>.
                </p>
                <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  ✓ Danh mục vẫn còn trong <strong>{otherStoreName}</strong>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-900">Xóa danh mục?</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Bạn sắp xóa <span className="font-semibold text-gray-900">"{cat.name}"</span>
                </p>
                {childCount > 0 && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠ Sẽ xóa theo <strong>{childCount} danh mục con</strong>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition-colors ${
              isInBothKhos ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading
              ? "Đang xử lý..."
              : isInBothKhos
              ? `Gỡ khỏi ${currentStoreName}`
              : "Xóa"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sortable row ──────────────────────────────────────────────────────────────
function SortableCategoryRow({
  cat,
  onEdit,
  onDelete,
  loading,
  expanded,
  onToggleExpand,
  activeStore,
}: {
  cat: Category;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  loading: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  activeStore: StoreFilter;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors bg-white"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
        title="Kéo để sắp xếp"
      >
        <GripVertical size={16} />
      </button>

      {/* Order badge */}
      <div className="w-7 h-7 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/25 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-[#7C3AED]">{cat.displayOrder}</span>
      </div>

      {/* Icon */}
      <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shrink-0 p-1.5">
        {cat.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r2Url(cat.iconUrl)} alt={cat.name} className="w-full h-full object-contain" />
        ) : (
          <FolderOpen size={18} className="text-gray-400" />
        )}
      </div>

      {/* Info + store badge + subs */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
          <StoreBadge cat={cat} />
        </div>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{cat.iconUrl ?? "Chưa có icon"}</p>

        <SubCategoryManager
          categoryName={cat.name}
          parentStore={activeStore}
          initialCount={cat._count.subCategories}
          initialSubs={cat.subCategories}
          expanded={expanded}
          onToggle={onToggleExpand}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 shrink-0 pt-0.5">
        <button
          type="button"
          onClick={() => onEdit(cat)}
          className="text-xs text-[#7C3AED] hover:text-[#A855F7] transition-colors"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => onDelete(cat)}
          disabled={loading}
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResourceCategoryManager({ initialCategories }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Khu vực của category đang edit (read-only, không cho đổi sau khi tạo)
  const [editingCatStore, setEditingCatStore] = useState<StoreFilter>("nguyen-lieu");
  const [formOpen, setFormOpen] = useState(false);

  const [editShowInNguyenLieu, setEditShowInNguyenLieu] = useState(true);
  const [editShowInTool, setEditShowInTool] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  // Luôn có 1 tab active — mặc định Nguyên Liệu MMO
  const [storeFilter, setStoreFilter] = useState<StoreFilter>("nguyen-lieu");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const nextOrder = categories.length > 0
    ? Math.max(...categories.map((c) => c.displayOrder)) + 1
    : 1;

  const searchTerm = searchQuery.trim().toLowerCase();

  const filteredCategories = categories
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
    .filter((c) => storeMatches(c, storeFilter))
    .filter((c) => !searchTerm || c.name.toLowerCase().includes(searchTerm));

  const nguyenLieuCount = categories.filter((c) => storeMatches(c, "nguyen-lieu")).length;
  const toolCount = categories.filter((c) => storeMatches(c, "tool")).length;
  const storeCounts: Record<StoreFilter, number> = { "nguyen-lieu": nguyenLieuCount, tool: toolCount };

  function toggleExpanded(id: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openForm() {
    setEditingId(null);
    setName("");
    setIconUrl("");
    setError("");
    setUploadError("");
    setImportUrl("");
    setEditingCatStore(storeFilter);
    setEditShowInNguyenLieu(storeFilter === "nguyen-lieu");
    setEditShowInTool(storeFilter === "tool");
    setFormOpen(true);
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setIconUrl(cat.iconUrl ?? "");
    setEditShowInNguyenLieu(cat.showInKhoTaiNguyen || cat.showInTaiNguyenMmo);
    setEditShowInTool(cat.showInToolPhanMem);
    setEditingCatStore(storeMatches(cat, "nguyen-lieu") ? "nguyen-lieu" : "tool");
    setError("");
    setUploadError("");
    setFormOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setIconUrl("");
    setError("");
    setUploadError("");
    setImportUrl("");
    setFormOpen(false);
  }

  async function handleSave() {
    if (!name.trim()) { setError("Tên danh mục không được để trống"); return; }
    setError("");
    setLoading(true);
    try {
      const url = editingId ? `/api/admin/resource-categories/${editingId}` : "/api/admin/resource-categories";
      const method = editingId ? "PATCH" : "POST";

      if (editingId && !editShowInNguyenLieu && !editShowInTool) {
        setError("Danh mục phải thuộc ít nhất 1 khu vực");
        return;
      }
      const body = editingId
        ? {
            name: name.trim(),
            iconUrl: iconUrl.trim(),
            showInKhoTaiNguyen: editShowInNguyenLieu,
            showInTaiNguyenMmo: editShowInNguyenLieu,
            showInToolPhanMem: editShowInTool,
          }
        : {
            name: name.trim(),
            iconUrl: iconUrl.trim(),
            showInKhoTaiNguyen: storeFilter === "nguyen-lieu",
            showInTaiNguyenMmo: storeFilter === "nguyen-lieu",
            showInToolPhanMem: storeFilter === "tool",
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: Category; error?: string };
      if (!res.ok) { setError(json.error ?? "Lưu thất bại"); return; }

      if (editingId) {
        setCategories((prev) => prev.map((c) =>
          c.id === editingId
            ? { ...(json.data ?? c), _count: c._count, subCategories: c.subCategories }
            : c
        ));
        toast.success("Đã cập nhật danh mục", name.trim());
      } else {
        const returned = json.data!;
        // API có thể trả về record cũ (đã update flag kho) thay vì tạo mới
        const isExisting = categories.some((c) => c.id === returned.id);
        if (isExisting) {
          setCategories((prev) => prev.map((c) =>
            c.id === returned.id
              ? { ...c, ...returned }
              : c
          ));
          toast.success("Đã thêm vào kho này", name.trim());
        } else {
          const newCat: Category = { ...returned, _count: { subCategories: 0 }, subCategories: [] };
          setCategories((prev) => [...prev, newCat]);
          toast.success("Đã thêm danh mục mới", name.trim());
        }
      }
      cancelEdit();
    } finally {
      setLoading(false);
    }
  }

  function startDelete(cat: Category) {
    setDeletingCat(cat);
  }

  async function confirmDelete() {
    if (!deletingCat) return;
    setDeleteLoading(true);

    const activeStores = (Object.keys(STORE_META) as StoreFilter[]).filter((k) => storeMatches(deletingCat, k));
    const isInBothKhos = activeStores.length > 1;

    try {
      if (isInBothKhos) {
        // Chỉ gỡ khỏi khu vực đang xem — không xóa hẳn khỏi DB
        const fields = STORE_META[storeFilter].fields;
        const patchBody = Object.fromEntries(fields.map((f) => [f, false]));
        const res = await fetch(`/api/admin/resource-categories/${deletingCat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) { toast.error(json.error ?? "Gỡ thất bại"); return; }
        setCategories((prev) =>
          prev.map((c) => c.id === deletingCat.id ? { ...c, ...patchBody } : c)
        );
        toast.success(`Đã gỡ khỏi ${STORE_META[storeFilter].label}`, deletingCat.name);
      } else {
        // Xóa hoàn toàn — danh mục chỉ thuộc 1 kho
        const res = await fetch(`/api/admin/resource-categories/${deletingCat.id}`, {
          credentials: "include",
          method: "DELETE",
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) { toast.error(json.error ?? "Xóa thất bại"); return; }
        setCategories((prev) => prev.filter((c) => c.id !== deletingCat.id));
        toast.success("Đã xóa danh mục", deletingCat.name);
      }
      setDeletingCat(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredCategories.findIndex((c) => c.id === active.id);
    const newIndex = filteredCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredCategories, oldIndex, newIndex).map((c, i) => ({
      ...c,
      displayOrder: i + 1,
    }));

    const snapshot = categories.slice();

    setCategories((prev) => {
      const reorderedMap = new Map(reordered.map((c) => [c.id, c]));
      return prev.map((c) => reorderedMap.get(c.id) ?? c);
    });

    try {
      const res = await fetch("/api/admin/resource-categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reordered.map((c) => ({ id: c.id, displayOrder: c.displayOrder })) }),
      });
      if (!res.ok) {
        setCategories(snapshot);
        toast.error("Lưu thứ tự thất bại", "Đã khôi phục thứ tự cũ");
      } else {
        toast.success("Đã lưu thứ tự mới");
      }
    } catch {
      setCategories(snapshot);
      toast.error("Lỗi kết nối", "Đã khôi phục thứ tự cũ");
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
      const res = await fetch("/api/admin/upload/thumbnail?type=resource-icon", {
        credentials: "include",
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Upload thất bại"); return; }
      setIconUrl(json.data?.url ?? "");
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
    setIsDraggingFile(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function handleImportUrl() {
    if (!importUrl.trim()) return;
    setUploadError("");
    setImporting(true);
    try {
      const res = await fetch("/api/admin/upload/from-url", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim(), uploadType: "resource-icon" }),
      });
      const json = (await res.json()) as { data?: { url: string }; error?: string };
      if (!res.ok) { setUploadError(json.error ?? "Import thất bại"); return; }
      setIconUrl(json.data?.url ?? "");
      setImportUrl("");
    } finally {
      setImporting(false);
    }
  }

  // Kho đang active trong form (create dùng storeFilter, edit dùng kho của cat)
  const activeFormStore = editingId ? editingCatStore : storeFilter;
  const drawerHeaderClass = activeFormStore === "nguyen-lieu"
    ? "bg-violet-50 border-violet-200"
    : "bg-amber-50 border-amber-200";

  const drawerTitle = editingId
    ? `Sửa danh mục · ${STORE_META[activeFormStore].label}`
    : `Thêm danh mục · ${STORE_META[storeFilter].label}`;

  return (
    <div className="space-y-6">

      {/* ── Delete Modal ── */}
      {deletingCat && (
        <DeleteModal
          cat={deletingCat}
          storeFilter={storeFilter}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeletingCat(null)}
          loading={deleteLoading}
        />
      )}

      {/* ── Drawer thêm / sửa ── */}
      <Drawer open={formOpen} onClose={cancelEdit} title={drawerTitle} headerClass={drawerHeaderClass}>
        <div className="space-y-4">

          {/* Phân kho — read-only khi tạo mới, có thể thay đổi khi sửa */}
          {editingId ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Hiển thị trên trang</p>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editShowInNguyenLieu}
                  onChange={(e) => setEditShowInNguyenLieu(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                  <Package size={13} /> Nguyên Liệu MMO
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editShowInTool}
                  onChange={(e) => setEditShowInTool(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                  <Wrench size={13} /> Tool - Phần mềm
                </span>
              </label>
            </div>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
              activeFormStore === "nguyen-lieu"
                ? "bg-violet-50 border-violet-200 text-violet-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              {(() => { const Icon = STORE_META[activeFormStore].Icon; return <><Icon size={13} /> {STORE_META[activeFormStore].label}</>; })()}
            </div>
          )}

          {/* Số thứ tự tiếp theo (chỉ khi tạo mới) */}
          {!editingId && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] bg-white border border-[#7C3AED]/20 rounded-full px-2.5 py-1">
              <span className="w-4 h-4 rounded-full bg-[#7C3AED] text-white text-[9px] font-bold flex items-center justify-center">
                {nextOrder}
              </span>
              Số thứ tự tiếp theo
            </span>
          )}

          {/* Tên danh mục */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Tên danh mục *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="vd: Facebook, Game, TikTok..."
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Icon preview */}
          {iconUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(iconUrl)} alt="icon preview" className="w-10 h-10 object-contain rounded border border-gray-200 bg-gray-50 p-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{iconUrl}</p>
              </div>
              <button type="button" onClick={() => setIconUrl("")} className="text-xs text-red-500 hover:text-red-700 shrink-0 transition-colors">
                Xóa
              </button>
            </div>
          )}

          {/* Upload */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Upload ảnh icon</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors py-5 bg-white ${
                isDraggingFile ? "border-[#7C3AED] bg-[#7C3AED]/5" : "border-gray-200 hover:border-[#7C3AED]/50"
              }`}
            >
              {uploading ? (
                <p className="text-xs text-gray-500">Đang upload...</p>
              ) : (
                <>
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-xs text-gray-400">Kéo thả hoặc click để chọn (JPG, PNG, WebP, SVG, GIF)</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden" onChange={handleFileChange} />
          </div>

          {/* URL trực tiếp */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Hoặc nhập URL icon trực tiếp</label>
            <div className="flex gap-2 items-center">
              <input
                type="url"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              {iconUrl && iconUrl.startsWith("http") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r2Url(iconUrl)} alt="preview" className="w-8 h-8 object-contain shrink-0 rounded border border-gray-200 bg-white p-1" />
              )}
            </div>
          </div>

          {/* Import từ URL */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Import từ URL (svgl.app, URL ảnh...)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://svgl.app/library/facebook-icon.svg"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => void handleImportUrl()}
                disabled={importing || !importUrl.trim()}
                className="px-3 py-2 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {importing ? "..." : "Import"}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">Hệ thống tải ảnh về server, không dùng URL ngoài trực tiếp.</p>
          </div>

          {/* Preset svgl.app */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Chọn nhanh từ svgl.app:</p>
            <div className="flex flex-wrap gap-2">
              {SVGL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  title={p.name}
                  onClick={() => setIconUrl(p.icon)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    iconUrl === p.icon
                      ? "border-[#7C3AED] bg-[#7C3AED]/10 ring-1 ring-[#7C3AED]/40"
                      : "border-gray-200 bg-white hover:border-[#7C3AED]/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r2Url(p.icon)} alt={p.name} className="w-6 h-6 object-contain" />
                  <span className="text-[9px] text-gray-500 max-w-13 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 transition-colors ${STORE_META[activeFormStore].solidClass}`}
            >
              {loading ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm danh mục"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      </Drawer>

      {/* ── Danh sách danh mục ── */}
      <section className="rounded-xl border border-gray-200 overflow-hidden">

        {/* Header: filter tabs + button thêm */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
              {(Object.keys(STORE_META) as StoreFilter[]).map((k) => {
                const meta = STORE_META[k];
                const Icon = meta.Icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setStoreFilter(k)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      storeFilter === k ? `${meta.solidClass} text-white shadow-sm` : `${meta.textClass} hover:bg-gray-50`
                    }`}
                  >
                    <Icon size={12} /> {meta.label} ({storeCounts[k]})
                  </button>
                );
              })}
            </div>

            {/* Button thêm — theo tab đang active */}
            <button
              type="button"
              onClick={openForm}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${STORE_META[storeFilter].solidClass}`}
            >
              {(() => { const Icon = STORE_META[storeFilter].Icon; return <Icon size={14} />; })()}
              + Thêm danh mục {STORE_META[storeFilter].label}
            </button>
          </div>

          {/* Count + drag hint + search */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 shrink-0">
              {filteredCategories.length}/{storeCounts[storeFilter]} danh mục
            </span>
            {!searchTerm && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">
                <GripVertical size={10} /> Kéo để sắp xếp
              </span>
            )}
            {searchTerm && (
              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Kéo thả tắt khi đang tìm
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Tìm danh mục trong ${STORE_META[storeFilter].label}...`}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#7C3AED]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="px-4 py-12 text-center space-y-3">
            <p className="text-sm text-gray-500">
              {searchTerm
                ? `Không tìm thấy danh mục nào khớp với "${searchQuery}"`
                : `Chưa có danh mục nào trong ${STORE_META[storeFilter].label}`}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={openForm}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${STORE_META[storeFilter].solidClass}`}
              >
                {(() => { const Icon = STORE_META[storeFilter].Icon; return <Icon size={14} />; })()}
                + Thêm danh mục đầu tiên
              </button>
            )}
          </div>
        ) : searchTerm ? (
          <div className="divide-y divide-gray-100">
            {filteredCategories.map((cat) => (
              <SortableCategoryRow
                key={cat.id}
                cat={cat}
                onEdit={startEdit}
                onDelete={startDelete}
                loading={loading || deleteLoading}
                expanded={expandedCats.has(cat.id)}
                onToggleExpand={() => toggleExpanded(cat.id)}
                activeStore={storeFilter}
              />
            ))}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
            <SortableContext items={filteredCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-gray-100">
                {filteredCategories.map((cat) => (
                  <SortableCategoryRow
                    key={cat.id}
                    cat={cat}
                    onEdit={startEdit}
                    onDelete={startDelete}
                    loading={loading || deleteLoading}
                    expanded={expandedCats.has(cat.id)}
                    onToggleExpand={() => toggleExpanded(cat.id)}
                    activeStore={storeFilter}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
