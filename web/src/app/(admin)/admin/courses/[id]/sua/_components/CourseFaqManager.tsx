"use client";

import { useState, useCallback } from "react";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  FolderPlus, Check, X, GripVertical,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
  displayOrder: number;
  categoryId: string | null;
  category: { id: string; name: string } | null;
}

interface FaqCategory {
  id: string;
  name: string;
  displayOrder: number;
  faqs: FaqItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FaqForm — tách ra ngoài để tránh unmount/remount khi parent re-render
// ─────────────────────────────────────────────────────────────────────────────

interface FaqFormValues {
  question: string;
  answer: string;
  categoryId: string;
  isActive: boolean;
}

interface FaqFormProps {
  categories: { id: string; name: string }[];
  initialValues: FaqFormValues;
  saving: boolean;
  onSave: (data: { question: string; answer: string; categoryId: string | null; isActive: boolean }) => void;
  onCancel: () => void;
}

function FaqForm({ categories, initialValues, saving, onSave, onCancel }: FaqFormProps) {
  const [question, setQuestion]     = useState(initialValues.question);
  const [answer, setAnswer]         = useState(initialValues.answer);
  const [categoryId, setCategoryId] = useState(initialValues.categoryId);
  const [isActive, setIsActive]     = useState(initialValues.isActive);

  function handleSave() {
    if (!question.trim() || !answer.trim()) return;
    onSave({ question: question.trim(), answer: answer.trim(), categoryId: categoryId || null, isActive });
  }

  return (
    <div className="border border-[#e2e8f0] rounded-xl p-4 bg-[#f8fafc] space-y-3">
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">Danh mục</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30 bg-white"
        >
          <option value="">— Không có danh mục —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">
          Câu hỏi <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Nhập câu hỏi..."
          autoFocus
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1">
          Câu trả lời <span className="text-red-500">*</span>
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Nhập câu trả lời..."
          rows={3}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="faq-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="faq-active" className="text-xs text-[#374151]">Hiển thị</label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !question.trim() || !answer.trim()}
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
// CourseFaqManager
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  courseId: string;
  initialCategories: FaqCategory[];
  initialFaqs: FaqItem[];
}

export default function CourseFaqManager({ courseId, initialCategories, initialFaqs }: Props) {
  const [categories, setCategories]     = useState<FaqCategory[]>(initialCategories);
  const [faqs, setFaqs]                 = useState<FaqItem[]>(initialFaqs);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [loading, setLoading]           = useState(false);

  // Category form
  const [newCatName, setNewCatName]   = useState("");
  const [editingCat, setEditingCat]   = useState<{ id: string; name: string } | null>(null);

  // FAQ form: catId = nhóm đang thêm mới | null = ẩn | "editing:<faqId>" = đang sửa
  const [faqFormKey, setFaqFormKey]   = useState<string | null>(null);
  const [editingFaq, setEditingFaq]   = useState<FaqItem | null>(null);
  const [faqInitVal, setFaqInitVal]   = useState<FaqFormValues>({ question: "", answer: "", categoryId: "", isActive: true });

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Category CRUD ──

  async function addCategory() {
    if (!newCatName.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/courses/${courseId}/faq-categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), displayOrder: categories.length }),
      });
      const json = await res.json() as { data?: FaqCategory };
      if (json.data) {
        setCategories((prev) => [...prev, { ...json.data!, faqs: [] }]);
        setNewCatName("");
        setExpandedCats((prev) => new Set([...prev, json.data!.id]));
      }
    } finally { setLoading(false); }
  }

  async function saveEditCat() {
    if (!editingCat?.name.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/courses/${courseId}/faq-categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCat.name.trim() }),
      });
      const json = await res.json() as { data?: FaqCategory };
      if (json.data) {
        setCategories((prev) => prev.map((c) => c.id === editingCat.id ? { ...c, name: editingCat.name.trim() } : c));
        setEditingCat(null);
      }
    } finally { setLoading(false); }
  }

  async function deleteCategory(catId: string) {
    if (!confirm("Xóa danh mục này sẽ xóa tất cả câu hỏi trong đó. Xác nhận?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/faq-categories/${catId}`, { method: "DELETE" });
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setFaqs((prev) => prev.filter((f) => f.categoryId !== catId));
    } finally { setLoading(false); }
  }

  // ── FAQ CRUD ──

  const openAddFaq = useCallback((catId: string) => {
    setEditingFaq(null);
    setFaqInitVal({ question: "", answer: "", categoryId: catId === "uncategorized" ? "" : catId, isActive: true });
    setFaqFormKey(`add-${catId}`);
    setExpandedCats((prev) => new Set([...prev, catId]));
  }, []);

  const openEditFaq = useCallback((faq: FaqItem) => {
    setEditingFaq(faq);
    setFaqInitVal({ question: faq.question, answer: faq.answer, categoryId: faq.categoryId ?? "", isActive: faq.isActive });
    setFaqFormKey(`edit-${faq.id}`);
  }, []);

  const closeFaqForm = useCallback(() => {
    setFaqFormKey(null);
    setEditingFaq(null);
  }, []);

  async function saveFaq(data: { question: string; answer: string; categoryId: string | null; isActive: boolean }) {
    setLoading(true);
    try {
      if (editingFaq) {
        const res  = await fetch(`/api/admin/courses/${courseId}/faqs/${editingFaq.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json() as { data?: FaqItem };
        if (json.data) {
          setFaqs((prev) => prev.map((f) => f.id === editingFaq.id ? json.data! : f));
          closeFaqForm();
        }
      } else {
        const res  = await fetch(`/api/admin/courses/${courseId}/faqs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, displayOrder: faqs.length }),
        });
        const json = await res.json() as { data?: FaqItem };
        if (json.data) {
          setFaqs((prev) => [...prev, json.data!]);
          closeFaqForm();
        }
      }
    } finally { setLoading(false); }
  }

  async function deleteFaq(faqId: string) {
    if (!confirm("Xóa câu hỏi này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/courses/${courseId}/faqs/${faqId}`, { method: "DELETE" });
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
      if (editingFaq?.id === faqId) closeFaqForm();
    } finally { setLoading(false); }
  }

  async function toggleFaqActive(faq: FaqItem) {
    const res  = await fetch(`/api/admin/courses/${courseId}/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !faq.isActive }),
    });
    const json = await res.json() as { data?: FaqItem };
    if (json.data) setFaqs((prev) => prev.map((f) => f.id === faq.id ? { ...f, isActive: !faq.isActive } : f));
  }

  const faqsInCat  = (catId: string | null) => faqs.filter((f) => f.categoryId === catId);
  const isAddingTo = (key: string) => faqFormKey === `add-${key}` && !editingFaq;
  const isEditing  = (faqId: string) => faqFormKey === `edit-${faqId}` && editingFaq?.id === faqId;

  const catList = categories.map((c) => ({ id: c.id, name: c.name }));

  // ── Render FAQ row ──
  const FaqRow = ({ faq }: { faq: FaqItem }) => (
    <div className={`border rounded-lg px-4 py-3 flex items-start gap-3 ${faq.isActive ? "border-[#e2e8f0] bg-white" : "border-[#f1f5f9] bg-[#f8fafc] opacity-60"}`}>
      <GripVertical size={14} className="text-[#cbd5e1] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0f172a] mb-1">{faq.question}</p>
        <p className="text-xs text-[#64748b] line-clamp-2">{faq.answer}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={() => void toggleFaqActive(faq)} title={faq.isActive ? "Ẩn" : "Hiện"} className="p-1 text-[#64748b] hover:text-[#0066ff]">
          {faq.isActive ? <Check size={13} className="text-[#16a34a]" /> : <X size={13} />}
        </button>
        <button type="button" onClick={() => openEditFaq(faq)} className="p-1 text-[#64748b] hover:text-[#0066ff]"><Pencil size={13} /></button>
        <button type="button" onClick={() => void deleteFaq(faq.id)} className="p-1 text-[#64748b] hover:text-red-500"><Trash2 size={13} /></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Thêm danh mục */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addCategory()}
          placeholder="Tên nhóm câu hỏi mới (VD: Học phí, Nội dung...)"
          className="flex-1 border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066ff]/30"
        />
        <button
          type="button"
          onClick={() => void addCategory()}
          disabled={loading || !newCatName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0066ff] text-white text-sm font-semibold rounded-xl hover:bg-[#0052cc] disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <FolderPlus size={15} /> Thêm nhóm
        </button>
      </div>

      {categories.length === 0 && faqs.length === 0 && (
        <p className="text-sm text-[#94a3b8] text-center py-6 border border-dashed border-[#e2e8f0] rounded-xl">
          Chưa có nhóm câu hỏi nào. Thêm nhóm để bắt đầu.
        </p>
      )}

      {/* Danh mục */}
      {categories.map((cat) => {
        const catFaqs  = faqsInCat(cat.id);
        const expanded = expandedCats.has(cat.id);
        return (
          <div key={cat.id} className="border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border-b border-[#e2e8f0]">
              <button type="button" onClick={() => toggleCat(cat.id)} className="text-[#64748b] hover:text-[#0f172a]">
                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <GripVertical size={14} className="text-[#cbd5e1]" />

              {editingCat?.id === cat.id ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={editingCat.name}
                    onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && void saveEditCat()}
                    className="flex-1 border border-[#0066ff] rounded-lg px-2 py-1 text-sm focus:outline-none"
                  />
                  <button type="button" onClick={() => void saveEditCat()} className="p-1 text-[#16a34a] hover:text-[#15803d]"><Check size={14} /></button>
                  <button type="button" onClick={() => setEditingCat(null)} className="p-1 text-[#64748b] hover:text-[#0f172a]"><X size={14} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-semibold text-[#0f172a]">{cat.name}</span>
                  <span className="text-xs text-[#94a3b8]">{catFaqs.length} câu hỏi</span>
                  <button type="button" onClick={() => setEditingCat({ id: cat.id, name: cat.name })} className="p-1 text-[#64748b] hover:text-[#0066ff]"><Pencil size={13} /></button>
                  <button type="button" onClick={() => void deleteCategory(cat.id)} className="p-1 text-[#64748b] hover:text-red-500"><Trash2 size={13} /></button>
                </>
              )}
            </div>

            {expanded && (
              <div className="p-4 space-y-2">
                {catFaqs.length === 0 && !isAddingTo(cat.id) && (
                  <p className="text-xs text-[#94a3b8] text-center py-3">Chưa có câu hỏi nào trong nhóm này.</p>
                )}

                {catFaqs.map((faq) => (
                  <div key={faq.id}>
                    {isEditing(faq.id)
                      ? <FaqForm key={faqFormKey!} categories={catList} initialValues={faqInitVal} saving={loading} onSave={(d) => void saveFaq(d)} onCancel={closeFaqForm} />
                      : <FaqRow faq={faq} />
                    }
                  </div>
                ))}

                {isAddingTo(cat.id) && (
                  <FaqForm key={faqFormKey!} categories={catList} initialValues={faqInitVal} saving={loading} onSave={(d) => void saveFaq(d)} onCancel={closeFaqForm} />
                )}

                <button
                  type="button"
                  onClick={() => openAddFaq(cat.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-[#0066ff]/40 text-[#0066ff] text-xs font-semibold rounded-lg hover:bg-[#eff6ff] transition-colors mt-1"
                >
                  <Plus size={13} /> Thêm câu hỏi vào nhóm này
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Câu hỏi không có danh mục */}
      {(faqsInCat(null).length > 0 || isAddingTo("uncategorized")) && (
        <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3 bg-[#fffbeb] border-b border-[#fde68a] cursor-pointer"
            onClick={() => toggleCat("uncategorized")}
          >
            <button type="button" className="text-[#64748b]">
              {expandedCats.has("uncategorized") ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <span className="flex-1 text-sm font-semibold text-[#92400e]">Chưa phân nhóm</span>
            <span className="text-xs text-[#b45309]">{faqsInCat(null).length} câu hỏi</span>
          </div>
          {expandedCats.has("uncategorized") && (
            <div className="p-4 space-y-2">
              {faqsInCat(null).map((faq) => (
                <div key={faq.id}>
                  {isEditing(faq.id)
                    ? <FaqForm key={faqFormKey!} categories={catList} initialValues={faqInitVal} saving={loading} onSave={(d) => void saveFaq(d)} onCancel={closeFaqForm} />
                    : <FaqRow faq={faq} />
                  }
                </div>
              ))}
              {isAddingTo("uncategorized") && (
                <FaqForm key={faqFormKey!} categories={catList} initialValues={faqInitVal} saving={loading} onSave={(d) => void saveFaq(d)} onCancel={closeFaqForm} />
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => openAddFaq("uncategorized")}
        className="flex items-center gap-1.5 px-4 py-2.5 border border-dashed border-[#e2e8f0] text-[#64748b] text-sm rounded-xl hover:bg-[#f8fafc] transition-colors"
      >
        <Plus size={14} /> Thêm câu hỏi (không phân nhóm)
      </button>
    </div>
  );
}
