"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Trash2, ImagePlus } from "lucide-react";
import { r2Url } from "@/lib/utils/image-url";

interface GalleryImage {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export interface ProductGalleryManagerProps {
  productId: string;
  /** Base API path, ví dụ "/api/seller/products" | "/api/products/mmo" | "/api/admin/khuongfb/products" */
  apiBase: string;
  /** true = route dạng flat + ?id= (khuongfb), false = route dạng nested [id] (mặc định) */
  useQueryId?: boolean;
  /** Endpoint upload ảnh đơn có sẵn, ví dụ "/api/storage/upload" hoặc "/api/admin/upload/thumbnail?type=mmo-thumbnail" */
  uploadUrl: string;
  /** Field chứa URL trong response upload: "publicUrl" (storage/upload) hoặc "url" (admin/upload/thumbnail) */
  uploadResponseKey: "publicUrl" | "url";
  /** Nếu upload endpoint cần FormData field "purpose" (chỉ /api/storage/upload) */
  uploadPurpose?: string;
  isAdmin?: boolean;
  maxImages?: number;
}

export default function ProductGalleryManager({
  productId,
  apiBase,
  useQueryId = false,
  uploadUrl,
  uploadResponseKey,
  uploadPurpose,
  isAdmin = false,
  maxImages = 10,
}: ProductGalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const listUrl = useQueryId ? `${apiBase}/images?id=${productId}` : `${apiBase}/${productId}/images`;
  const createUrl = listUrl;
  const deleteUrl = useCallback(
    (imageId: string) =>
      useQueryId
        ? `${apiBase}/images?id=${productId}&imageId=${imageId}`
        : `${apiBase}/${productId}/images/${imageId}`,
    [apiBase, productId, useQueryId],
  );

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(listUrl, { credentials: "include" });
      const json = await res.json() as { success?: boolean; data?: GalleryImage[]; error?: string };
      if (!res.ok || (json.success === false)) { setError(json.error ?? "Không tải được ảnh"); return; }
      setImages(json.data ?? []);
    } catch {
      setError("Lỗi kết nối mạng");
    } finally {
      setLoading(false);
    }
  }, [listUrl]);

  useEffect(() => { void fetchImages(); }, [fetchImages]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length >= maxImages) { setUploadError(`Đã đạt giới hạn tối đa ${maxImages} ảnh`); return; }

    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (uploadPurpose) formData.append("purpose", uploadPurpose);

      const uploadRes = await fetch(uploadUrl, { method: "POST", credentials: "include", body: formData });
      const uploadJson = await uploadRes.json() as { data?: { publicUrl?: string; url?: string }; error?: string };
      const imageUrl = uploadResponseKey === "publicUrl" ? uploadJson.data?.publicUrl : uploadJson.data?.url;
      if (!uploadRes.ok || !imageUrl) { setUploadError(uploadJson.error ?? "Tải ảnh lên thất bại"); return; }

      const createRes = await fetch(createUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const createJson = await createRes.json() as { success?: boolean; data?: GalleryImage; error?: string };
      if (!createRes.ok || (createJson.success === false) || !createJson.data) {
        setUploadError(createJson.error ?? "Thêm ảnh thất bại");
        return;
      }
      setImages((imgs) => [...imgs, createJson.data!]);
    } catch {
      setUploadError("Lỗi kết nối mạng");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(deleteUrl(deleteId), { method: "DELETE", credentials: "include" });
      const json = await res.json() as { success?: boolean };
      if (!res.ok || json.success === false) { setDeleteId(null); return; }
      setImages((imgs) => imgs.filter((img) => img.id !== deleteId));
      setDeleteId(null);
    } catch {
      setDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isAdmin ? "text-violet-600" : "text-[#e11d48]"}`}>
            Thư viện ảnh sản phẩm
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {images.length}/{maxImages} ảnh — hiển thị trong gallery ở trang chi tiết
          </p>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= maxImages}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 ${
            isAdmin ? "bg-violet-600 hover:bg-violet-700" : "bg-primary hover:bg-[#0052cc]"
          }`}
        >
          <Plus size={12} />
          {uploading ? "Đang tải..." : "Thêm ảnh"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFileSelected(e)}
        />
      </div>

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-sm">{error}</div>
      ) : images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
          <ImagePlus size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">Chưa có ảnh gallery nào</p>
          <p className="text-xs text-gray-300 mt-1">Ảnh đại diện hiện tại sẽ tự động là ảnh đầu tiên</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r2Url(img.imageUrl)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setDeleteId(img.id)}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Xóa ảnh"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Xóa ảnh này?</p>
                <p className="text-xs text-gray-500 mt-0.5">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleDelete()}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleteLoading ? "Đang xóa..." : "Xóa"}
              </button>
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
