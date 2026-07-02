import { prisma } from "@/lib/db/prisma";
import CreateRuleForm from "./_components/CreateRuleForm";
import RuleActions from "./_components/RuleActions";

const ORDER_TYPE_LABEL: Record<string, string> = {
  SERVICE: "Dịch vụ",
  COURSE: "Khóa học",
  TUTTRICK: "Tut / Tricks",
  MMO_PRODUCT: "Tài nguyên MMO",
  SELLER_PRODUCT: "Sản phẩm Seller",
  KHUONGFB_PRODUCT: "Sản phẩm Khuongfb",
};

export default async function AdminAffiliateRulesPage() {
  const rules = await prisma.affiliateCommissionRule.findMany({
    include: { affiliate: { select: { fullName: true, email: true, affiliateCode: true } } },
    orderBy: [{ affiliateId: "asc" }, { orderType: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Cấu hình % hoa hồng Affiliate</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tạo rule mới</h2>
        <CreateRuleForm />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">Áp dụng cho</th>
              <th className="px-4 py-3">Loại sản phẩm</th>
              <th className="px-4 py-3">% hoa hồng</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  {r.affiliate ? (
                    <>
                      {r.affiliate.fullName} <span className="text-xs text-gray-400 font-mono">({r.affiliate.affiliateCode})</span>
                    </>
                  ) : (
                    <span className="italic text-gray-500">Mặc định toàn hệ thống</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.orderType ? ORDER_TYPE_LABEL[r.orderType] ?? r.orderType : <span className="italic text-gray-500">Tất cả</span>}
                </td>
                <td className="px-4 py-3 font-medium text-violet-600">{Number(r.commissionPercent)}%</td>
                <td className="px-4 py-3">{r.priority}</td>
                <td className="px-4 py-3">
                  <span className={r.isActive ? "text-green-600" : "text-gray-400"}>
                    {r.isActive ? "Đang bật" : "Đã tắt"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RuleActions ruleId={r.id} isActive={r.isActive} />
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Chưa có rule hoa hồng nào — cần tạo ít nhất 1 rule mặc định để hệ thống tính hoa hồng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
