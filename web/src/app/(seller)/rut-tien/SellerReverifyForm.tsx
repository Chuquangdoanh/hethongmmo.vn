"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

interface ReverifyRequest {
  id: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface Props {
  recentRequests: ReverifyRequest[];
}

async function uploadFile(file: File, type: "cccd" | "portrait"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/user/upload?type=${type}`, { credentials: "include", method: "POST", body: fd });
  const json = await res.json() as { data?: { url?: string }; error?: string };
  if (!res.ok || !json.data?.url) {
    throw new Error(json.error ?? `Upload ${type} thất bại`);
  }
  return json.data.url;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:  "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING:  "text-amber-600 bg-amber-50 border-amber-200",
  APPROVED: "text-emerald-600 bg-emerald-50 border-emerald-200",
  REJECTED: "text-red-600 bg-red-50 border-red-200",
};

export default function SellerReverifyForm({ recentRequests }: Props) {
  const router = useRouter();
  const [cccdFile, setCccdFile] = useState<File | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const cccdRef = useRef<HTMLInputElement>(null);
  const portraitRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pendingRequest = recentRequests.find((r) => r.status === "PENDING");
  const history = recentRequests.filter((r) => r.status !== "PENDING");

  async function handleSubmit() {
    if (!cccdFile) { setError("Vui lòng upload ảnh CCCD/CMND"); return; }
    if (!portraitFile) { setError("Vui lòng upload ảnh chân dung"); return; }

    setLoading(true);
    setError("");
    try {
      const [cccdUrl, portraitUrl] = await Promise.all([
        uploadFile(cccdFile, "cccd"),
        uploadFile(portraitFile, "portrait"),
      ]);

      const res = await fetch("/api/seller/reverify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cccdImageUrl: cccdUrl, portraitImageUrl: portraitUrl }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Gửi yêu cầu thất bại");
        return;
      }
      setCccdFile(null);
      setPortraitFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-red-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <ShieldAlert size={16} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-700">Cần xác minh lại tài khoản</p>
          <p className="text-xs text-red-500 mt-0.5">
            Quản trị viên yêu cầu bạn nộp lại ảnh CCCD/CMND và ảnh chân dung trước khi rút tiền.
          </p>
        </div>
      </div>

      {pendingRequest ? (
        <div className="mx-5 my-4 rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-3">
          <Clock size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Đang chờ admin duyệt</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Yêu cầu xác minh lại gửi lúc {formatDate(new Date(pendingRequest.createdAt))} đang được xem xét.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Ảnh CCCD/CMND <span className="text-red-500">*</span>
              </label>
              <input
                ref={cccdRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { setCccdFile(e.target.files?.[0] ?? null); setError(""); }}
              />
              <button
                type="button"
                onClick={() => cccdRef.current?.click()}
                className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors text-sm bg-white ${
                  cccdFile
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500"
                }`}
              >
                <span className="text-2xl">{cccdFile ? "✓" : "🪪"}</span>
                <span className="text-[11px] font-medium px-1 text-center leading-tight">
                  {cccdFile ? cccdFile.name.slice(0, 20) + (cccdFile.name.length > 20 ? "..." : "") : "Chọn ảnh CCCD"}
                </span>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                Ảnh chân dung <span className="text-red-500">*</span>
              </label>
              <input
                ref={portraitRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { setPortraitFile(e.target.files?.[0] ?? null); setError(""); }}
              />
              <button
                type="button"
                onClick={() => portraitRef.current?.click()}
                className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors text-sm bg-white ${
                  portraitFile
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 text-gray-400 hover:border-violet-400 hover:text-violet-500"
                }`}
              >
                <span className="text-2xl">{portraitFile ? "✓" : "📷"}</span>
                <span className="text-[11px] font-medium px-1 text-center leading-tight">
                  {portraitFile ? portraitFile.name.slice(0, 20) + (portraitFile.name.length > 20 ? "..." : "") : "Ảnh selfie/chân dung"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-white border border-red-200 px-3 py-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          <button
            onClick={() => { void handleSubmit(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Đang gửi..." : "Gửi xác minh lại"}
          </button>
        </div>
      )}

      {history.length > 0 && (
        <div className="border-t border-red-100 divide-y divide-red-100">
          {history.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="shrink-0">
                {r.status === "APPROVED" && <CheckCircle size={14} className="text-emerald-500" />}
                {r.status === "REJECTED" && <XCircle     size={14} className="text-red-400"     />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700">Nộp lúc {formatDate(new Date(r.createdAt))}</p>
                {r.rejectReason && <p className="text-[10px] text-red-400">Lý do: {r.rejectReason}</p>}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status] ?? "text-gray-500"}`}>
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
