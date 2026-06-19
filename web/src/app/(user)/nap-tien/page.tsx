import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { formatVnd, formatDate } from "@/lib/utils/format";
import { CreditCard, History, Zap, Gift, AlertTriangle, ChevronRight } from "lucide-react";
import UserProfileHero from "@/components/shared/UserProfileHero";
import DepositPanel from "./_components/DepositPanel";

export const metadata: Metadata = { title: "Nạp tiền" };

const BANK_INFO = {
  bankName:      process.env.BANK_NAME           ?? "MB Bank",
  accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "0393118789",
  accountHolder: process.env.BANK_ACCOUNT_HOLDER ?? "CHU QUANG DOANH",
  bankBin:       process.env.BANK_BIN            ?? "MB",
};

const TX_TYPE_DEPOSIT = ["DEPOSIT_AUTO", "DEPOSIT_MANUAL"] as never[];

export default async function NapTienPage() {
  const session = await auth();
  const me = session!.user as AuthenticatedUser;

  const [user, lastDeposit, depositHistory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: me.id },
      select: {
        balance: true, totalDeposited: true, totalSpent: true,
        fullName: true, email: true, role: true, avatarUrl: true,
      },
    }),
    prisma.transaction.findFirst({
      where: { userId: me.id, type: { in: TX_TYPE_DEPOSIT } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { userId: me.id, type: { in: TX_TYPE_DEPOSIT } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    }),
  ]);

  if (!user) redirect("/");

  const balance        = Number(user.balance);
  const totalDeposited = Number(user.totalDeposited);
  const totalSpent     = Number(user.totalSpent);
  // Derive từ UUID session — không phụ thuộc vào uid_prefix column (có thể rỗng)
  const depositId      = me.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const transferContent = `NAP ${depositId}`;

  return (
    <>
      <UserProfileHero
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        uidPrefix={depositId.toLowerCase()}
        balance={balance}
        totalDeposited={totalDeposited}
        totalSpent={totalSpent}
        lastDepositAt={lastDeposit?.createdAt ?? null}
        activeTab="deposit"
        avatarUrl={user.avatarUrl ?? null}
      />

      <div className="bg-gray-50 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-6 min-h-[60vh]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left: QR + bank info (3/5) ── */}
          <div className="lg:col-span-3 space-y-4">
            <DepositPanel
              bankName={BANK_INFO.bankName}
              accountNumber={BANK_INFO.accountNumber}
              accountHolder={BANK_INFO.accountHolder}
              bankBin={BANK_INFO.bankBin}
              transferContent={transferContent}
            />

            {/* Deposit history */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <History size={15} className="text-gray-400" />
                  Lịch sử nạp tiền
                </h3>
                <Link href="/lich-su-giao-dich" className="flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                  Xem tất cả <ChevronRight size={12} />
                </Link>
              </div>
              {depositHistory.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <CreditCard size={22} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Chưa có giao dịch nạp tiền nào</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {depositHistory.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 truncate">{tx.description}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 shrink-0 ml-4">
                        +{formatVnd(Number(tx.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Info sidebar (2/5) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Hỗ trợ dịch vụ */}
            <div className="rounded-2xl bg-text-dark border border-slate-700 p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap size={14} className="text-yellow-400" />
                </div>
                <h3 className="text-sm font-semibold">Hỗ trợ Dịch vụ</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Nạp tối thiểu <strong className="text-white">50.000đ</strong> để bắt đầu sử dụng các dịch vụ tốt nhất trang mạng xã hội.
              </p>
              <p className="text-[13px] text-slate-500 uppercase tracking-wide mb-1">Dịch vụ độc quyền chỉ từ: </p>
              <p className="text-2xl font-bold text-amber-400">100.000đ</p>
              <Link
                href="/dich-vu"
                className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Xem dịch vụ <ChevronRight size={12} />
              </Link>
            </div>

            {/* Tự động khấu trừ */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap size={13} className="text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold text-amber-800">Tự động khấu trừ</h3>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Khi bạn thực hiện mua khóa học hoặc đăng ký dịch vụ thành công, hệ thống sẽ tự động khấu trừ tiền từ số dư tài khoản của bạn.
              </p>
            </div>

            {/* ĐẶC QUYỀN HỘI VIÊN & ĐỐI TÁC */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Gift size={13} className="text-violet-600" />
                </div>
                ĐẶC QUYỀN HỘI VIÊN & ĐỐI TÁC
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { tier: "Thành Viên Đồng Hành",    desc: "Trên 15tr",  pct: "+5%",  cls: "bg-blue-50 text-blue-700 border-blue-100" },
                  { tier: "Chuyên Gia Tăng Trưởng", desc: "Trên 50tr", pct: "+10%",  cls: "bg-slate-50 text-slate-700 border-slate-200" },
                  { tier: "Chuyên Gia Bứt Phá",   desc: "Trên 100tr", pct: "+15%", cls: "bg-amber-50 text-amber-700 border-amber-100" },
                ].map(({ tier, desc, pct, cls }) => (
                  <div key={tier} className={`rounded-xl border p-2.5 text-center ${cls}`}>
                    <p className="text-[11px] font-semibold">{tier}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{desc}</p>
                    <p className="text-sm font-bold mt-1">{pct}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-2.5 text-center">
                <p className="text-[11px] font-semibold text-violet-700">Đối Tác Toàn Diện</p>
                <p className="text-sm font-bold text-violet-600">Giảm 20%</p>
              </div>
            </div>

            {/* Lưu ý quan trọng */}
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4">
              <h3 className="text-xs font-bold text-orange-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-orange-500 shrink-0" />
                Lưu ý quan trọng
              </h3>
              <p className="text-xs text-orange-700 leading-relaxed">
                Vui lòng <strong>không thay đổi nội dung chuyển khoản</strong> để hệ thống có thể nhận diện và cộng tiền tự động chính xác nhất.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
