"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X, AlertTriangle, Check, Loader2 } from "lucide-react";

interface Props {
  itemId: string;
  productId: string;
  content: string;
  status: string;
}

export default function StockRowActions({ itemId, productId, content, status }: Props) {
  const router = useRouter();

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(content);
  const [editPhase, setEditPhase] = useState<"idle" | "saving" | "duplicate" | "error">("idle");
  const [editError, setEditError] = useState("");
  const [duplicateItemId, setDuplicateItemId] = useState("");

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");

  const canAct = status !== "SOLD";

  // ── Edit handlers ─────────────────────────────────────────────────────────

  function openEdit() {
    setEditText(content);
    setEditPhase("idle");
    setEditError("");
    setDuplicateItemId("");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditPhase("idle");
  }

  async function saveEdit(force = false) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setEditPhase("saving");
    setEditError("");

    try {
      const res = await fetch(`/api/products/mmo/${productId}/stock/${itemId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, force }),
      });
      const json = await res.json() as {
        success: boolean;
        error?: string;
        code?: string;
        data?: { duplicateItemId?: string };
      };

      if (res.ok && json.success) {
        setEditOpen(false);
        setEditPhase("idle");
        router.refresh();
        return;
      }

      if (json.code === "DUPLICATE_CONTENT") {
        setEditPhase("duplicate");
        setDuplicateItemId(json.data?.duplicateItemId ?? "");
        return;
      }

      setEditPhase("error");
      setEditError(json.error ?? "Lỗi khi lưu. Thử lại sau.");
    } catch {
      setEditPhase("error");
      setEditError("Lỗi kết nối. Thử lại sau.");
    }
  }

  // ── Delete handlers ───────────────────────────────────────────────────────

  async function confirmDelete() {
    setDeletePhase("deleting");
    setDeleteError("");
    try {
      const res = await fetch(`/api/products/mmo/${productId}/stock/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json() as { success: boolean; error?: string };

      if (res.ok && json.success) {
        setDeletePhase("idle");
        router.refresh();
        return;
      }
      setDeletePhase("error");
      setDeleteError(json.error ?? "Xóa thất bại.");
    } catch {
      setDeletePhase("error");
      setDeleteError("Lỗi kết nối. Thử lại sau.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Action buttons hoặc delete confirm inline */}
      <div className="flex items-center gap-1">
        {deletePhase === "confirm" || deletePhase === "deleting" || deletePhase === "error" ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {deletePhase === "error" && (
              <span className="text-[10px] text-red-600">{deleteError}</span>
            )}
            {deletePhase !== "error" && (
              <span className="text-[10px] text-red-600 font-medium">Xóa item này?</span>
            )}
            <button
              onClick={() => void confirmDelete()}
              disabled={deletePhase === "deleting"}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {deletePhase === "deleting" ? (
                <Loader2 size={9} className="animate-spin" />
              ) : (
                <Check size={9} />
              )}
              Xóa
            </button>
            <button
              onClick={() => { setDeletePhase("idle"); setDeleteError(""); }}
              disabled={deletePhase === "deleting"}
              className="px-2 py-0.5 rounded border border-gray-200 text-gray-500 text-[10px] hover:border-gray-300 transition-colors"
            >
              Hủy
            </button>
          </div>
        ) : (
          <>
            {canAct && (
              <button
                onClick={openEdit}
                title="Sửa nội dung"
                className="p-1.5 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Pencil size={13} />
              </button>
            )}
            {canAct && (
              <button
                onClick={() => setDeletePhase("confirm")}
                title="Xóa item"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
            {!canAct && <span className="text-[10px] text-gray-300">—</span>}
          </>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Sửa nội dung item</p>
              <button
                onClick={closeEdit}
                disabled={editPhase === "saving"}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500">
                ID: <span className="font-mono">{itemId.slice(0, 16)}…</span>
              </p>
              <textarea
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  if (editPhase === "duplicate" || editPhase === "error") setEditPhase("idle");
                }}
                rows={5}
                disabled={editPhase === "saving"}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono text-gray-900 focus:border-violet-500 focus:bg-white focus:outline-none resize-none disabled:opacity-60 transition-colors"
              />

              {/* Duplicate warning */}
              {editPhase === "duplicate" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-800 font-semibold">Nội dung đã tồn tại trong kho!</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Trùng với item <span className="font-mono">{duplicateItemId.slice(0, 12)}…</span>
                    </p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      Vẫn muốn lưu? Nhấn <strong>"Lưu dù trùng"</strong> để xác nhận.
                    </p>
                  </div>
                </div>
              )}

              {/* Error */}
              {editPhase === "error" && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {editError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={closeEdit}
                disabled={editPhase === "saving"}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:border-gray-300 transition-colors"
              >
                Hủy
              </button>

              {editPhase === "duplicate" && (
                <button
                  onClick={() => void saveEdit(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
                >
                  <AlertTriangle size={13} />
                  Lưu dù trùng
                </button>
              )}

              <button
                onClick={() => void saveEdit(false)}
                disabled={editPhase === "saving" || !editText.trim() || editText.trim() === content}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {editPhase === "saving" ? (
                  <><Loader2 size={13} className="animate-spin" /> Đang lưu...</>
                ) : (
                  <><Check size={13} /> Lưu</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
