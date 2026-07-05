import type { Metadata } from "next";
import Link from "next/link";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";

import { buildMeta } from "@/lib/utils/seo";
export const metadata: Metadata = buildMeta({
  title: "Điều Khoản Dịch Vụ | hethongmmo.vn",
  description: "Điều khoản sử dụng nền tảng MMO Marketplace hethongmmo.vn. Cập nhật lần cuối: 06/06/2026.",
  url: "/dieu-khoan",
  image: "/images/hethong.png",
});

const SECTIONS = [
  {
    id: "can-cu-phap-ly",
    title: "Căn cứ pháp lý",
    intro: "Điều khoản này được xây dựng trên cơ sở:",
    items: [
      "Phù hợp với pháp luật Việt Nam.",
      "Tuân thủ Luật Giao dịch điện tử.",
      "Tuân thủ Luật An ninh mạng.",
      "Tuân thủ Luật Bảo vệ quyền lợi người tiêu dùng.",
      "Tuân thủ Nghị định về thương mại điện tử.",
      "Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.",
      "Tuân thủ các điều ước quốc tế mà Việt Nam là thành viên.",
      "Chỉ cho phép giao dịch các sản phẩm, dịch vụ hợp pháp.",
    ],
    type: "list" as const,
  },
  {
    id: "dinh-nghia",
    title: "Định nghĩa",
    items: [
      { term: "Sàn MMO", def: "Nền tảng trung gian kết nối Người bán và Người mua." },
      { term: "Người bán", def: "Cá nhân hoặc tổ chức đăng bán sản phẩm, dịch vụ số." },
      { term: "Người mua", def: "Cá nhân hoặc tổ chức mua sản phẩm trên nền tảng." },
      { term: "Sản phẩm số", def: "Tài khoản, phần mềm, source code, khóa học, dịch vụ marketing, dịch vụ mạng xã hội, tài nguyên số, website, hosting, VPS và các sản phẩm hợp pháp khác." },
    ],
    type: "definition" as const,
  },
  {
    id: "dieu-kien",
    title: "Điều kiện sử dụng",
    intro: "Người dùng phải:",
    items: [
      "Từ đủ 18 tuổi hoặc được người giám hộ hợp pháp cho phép.",
      "Cung cấp thông tin chính xác khi đăng ký.",
      "Chịu trách nhiệm bảo mật tài khoản.",
      "Không chia sẻ tài khoản cho bên thứ ba.",
    ],
    type: "list" as const,
  },
  {
    id: "nha-ban-hang",
    title: "Quy định dành cho nhà bán hàng",
    intro: "Nhà bán hàng cam kết:",
    items: [
      "Sở hữu hợp pháp sản phẩm đăng bán.",
      "Không bán sản phẩm vi phạm pháp luật Việt Nam.",
      "Không bán tài khoản bị đánh cắp.",
      "Không bán dữ liệu cá nhân trái phép.",
      "Không bán phần mềm độc hại, virus, mã độc.",
      "Không thực hiện hành vi lừa đảo.",
      "Cung cấp mô tả sản phẩm chính xác.",
      "Hỗ trợ khách hàng theo đúng cam kết.",
    ],
    type: "list" as const,
  },
  {
    id: "san-pham-cam",
    title: "Danh mục sản phẩm bị cấm",
    intro: "Cấm đăng bán:",
    items: [
      "Dữ liệu cá nhân trái phép.",
      "Tài khoản ngân hàng.",
      "Giấy tờ giả.",
      "Công cụ hack, malware, ransomware.",
      "Phần mềm tấn công mạng.",
      "Công cụ spam bất hợp pháp.",
      "Nội dung vi phạm bản quyền.",
      "Vũ khí, chất cấm.",
      "Nội dung đồi trụy.",
      "Hàng hóa bị pháp luật cấm kinh doanh.",
      "Nick hack, BM hack, Fanpage hack.",
      "Cookie, token, session bị đánh cắp.",
      "CCCD, hộ chiếu, giấy phép lái xe.",
      "SIM rác.",
      "Dữ liệu cá nhân, thông tin ngân hàng, thẻ tín dụng.",
      "Ví điện tử bị đánh cắp.",
      "Malware, virus, trojan, rootkit, spyware, backdoor, ransomware, keylogger.",
      "Tool crack, license crack, key lậu.",
      "Botnet, phishing kit.",
      "Fake OTP, fake SMS, fake KYC.",
      "Tool bypass trái phép.",
      "Deepfake phục vụ lừa đảo.",
      "Dịch vụ hack, DDoS, spam, lừa đảo.",
      "Mọi sản phẩm vi phạm pháp luật Việt Nam.",
      "Mọi sản phẩm vi phạm điều ước quốc tế.",
    ],
    type: "list" as const,
    accent: "red" as const,
  },
  {
    id: "giao-dich",
    title: "Giao dịch và thanh toán",
    items: [
      "Mọi giao dịch được thực hiện thông qua hệ thống.",
      "Sàn có quyền giữ tiền giao dịch để xác minh tranh chấp.",
      "Phí giao dịch được công bố công khai trên website.",
      "Thanh toán hoàn tất khi hệ thống xác nhận thành công.",
    ],
    type: "list" as const,
  },
  {
    id: "hoan-tien",
    title: "Hoàn tiền và tranh chấp",
    groups: [
      {
        label: "Người mua được quyền khiếu nại nếu:",
        items: ["Không nhận được sản phẩm.", "Sản phẩm không đúng mô tả.", "Sản phẩm lỗi không thể sử dụng."],
      },
      {
        label: "Phương thức hoàn tiền:",
        items: [
          "Mọi khoản hoàn trả được ghi nhận vào số dư ví nội bộ trên nền tảng, không hoàn trực tiếp vào tài khoản ngân hàng.",
          "Số dư ví nội bộ có thể dùng để mua sản phẩm/dịch vụ khác trên sàn.",
          "Việc rút số dư về tài khoản ngân hàng có thể phát sinh phí rút tiền theo quy định hiện hành.",
        ],
      },
      {
        label: "Sàn có quyền:",
        items: ["Tạm giữ thanh toán.", "Yêu cầu bằng chứng từ hai bên.", "Ra quyết định cuối cùng dựa trên dữ liệu giao dịch."],
      },
    ],
    type: "grouped" as const,
  },
  {
    id: "bao-hanh",
    title: "Chính sách bảo hành",
    intro: "Điều kiện và phạm vi bảo hành:",
    items: [
      "Bảo hành 1-1: Trong thời hạn bảo hành ghi trên sản phẩm, sản phẩm lỗi do nguyên nhân từ người bán sẽ được đổi mới tương đương.",
      "Thời hạn bảo hành được ghi rõ tại trang mô tả từng sản phẩm; hết hạn bảo hành thì không áp dụng đổi/trả.",
      "Sàn có quyền từ chối bảo hành nếu người mua vi phạm chính sách của nền tảng thứ ba (ví dụ: sử dụng tài khoản để chạy quảng cáo gian lận, vi phạm điều khoản nhà cung cấp dịch vụ).",
      "Bảo hành không áp dụng nếu người mua tự ý thay đổi thông tin tài khoản (mật khẩu, email liên kết, số điện thoại) trước khi báo cáo lỗi.",
      "Khiếu nại bảo hành phải có bằng chứng cụ thể và được gửi trong thời hạn khiếu nại quy định tại mục Khiếu nại & Tranh chấp.",
    ],
    type: "list" as const,
  },
  {
    id: "giu-doanh-thu",
    title: "Cơ chế giữ doanh thu (Escrow)",
    intro: "Quy trình giữ và giải phóng doanh thu người bán:",
    items: [
      "Doanh thu từ mỗi giao dịch thành công sẽ được giữ từ 24–72 giờ trước khi cộng vào số dư khả dụng của người bán.",
      "Thời gian giữ tạo cửa sổ khiếu nại cho người mua; trong thời gian này sàn có thể can thiệp nếu có tranh chấp hợp lệ.",
      "Sau khi hết thời gian giữ và không có tranh chấp, doanh thu được giải phóng hoàn toàn về ví người bán.",
      "Nếu có khiếu nại được xác nhận trong thời gian giữ, sàn có quyền điều chỉnh doanh thu theo kết quả xử lý tranh chấp.",
      "Thời gian giữ cụ thể có thể thay đổi tùy loại sản phẩm và lịch sử giao dịch của người bán.",
    ],
    type: "list" as const,
  },
  {
    id: "quyen-san",
    title: "Quyền của sàn",
    intro: "Chúng tôi có quyền:",
    items: [
      "Gỡ bỏ sản phẩm vi phạm.",
      "Khóa tài khoản vi phạm.",
      "Từ chối cung cấp dịch vụ.",
      "Hợp tác với cơ quan chức năng khi có yêu cầu hợp pháp.",
    ],
    type: "list" as const,
  },
  {
    id: "trach-nhiem",
    title: "Giới hạn trách nhiệm",
    intro: "Sàn đóng vai trò trung gian kết nối. Chúng tôi không chịu trách nhiệm đối với:",
    items: [
      "Thiệt hại phát sinh từ việc sử dụng sản phẩm.",
      "Thỏa thuận ngoài hệ thống.",
      "Tổn thất do lỗi từ người dùng.",
      "Việc khóa tài khoản Facebook, Google, Telegram từ nền tảng thứ ba.",
      "Lỗi API bên thứ ba.",
      "Lỗi VPS, hosting, DNS, CDN, Cloudflare.",
      "Lỗi từ đơn vị thanh toán.",
      "Lỗi do sử dụng trái hướng dẫn.",
    ],
    type: "list" as const,
  },
  {
    id: "cham-dut",
    title: "Chấm dứt tài khoản",
    intro: "Tài khoản có thể bị khóa nếu:",
    items: [
      "Gian lận giao dịch.",
      "Cung cấp thông tin giả.",
      "Lạm dụng hệ thống.",
      "Vi phạm điều khoản.",
    ],
    type: "list" as const,
    accent: "red" as const,
  },
  {
    id: "khieu-nai-tranh-chap",
    title: "Khiếu nại & Tranh chấp",
    type: "grouped" as const,
    groups: [
      {
        label: "Thời hạn khiếu nại theo loại sản phẩm:",
        items: [
          "Sản phẩm số (tài khoản, tài nguyên, via, clone, source code): 2 giờ kể từ khi nhận sản phẩm.",
          "Dịch vụ dài hạn (Website, Hosting, Khóa học, VPS): 7 ngày kể từ khi bàn giao.",
        ],
      },
      {
        label: "Quy trình xử lý:",
        items: [
          "Khiếu nại phải có bằng chứng cụ thể kèm theo (ảnh chụp màn hình, video, log lỗi).",
          "Hai bên có trách nhiệm hợp tác cung cấp thông tin trong vòng 24 giờ kể từ khi được yêu cầu.",
          "Quyết định của hệ thống trọng tài nội bộ là căn cứ xử lý cuối cùng.",
          "Trường hợp nghi ngờ gian lận, sàn có quyền tạm giữ thanh toán để xác minh.",
        ],
      },
    ],
  },
  {
    id: "chong-rua-tien",
    title: "Phòng chống rửa tiền (AML)",
    intro: "Cam kết của người dùng và quyền của sàn:",
    items: [
      "Tên tài khoản ngân hàng đăng ký rút tiền phải khớp chính xác với tên đã xác minh danh tính (KYC) trên hệ thống.",
      "Sàn có quyền tạm khóa tài khoản và phong tỏa số dư nếu phát hiện giao dịch bất thường hoặc nghi ngờ gian lận, rửa tiền.",
      "Trong trường hợp có yêu cầu hợp pháp từ cơ quan chức năng, sàn sẽ cung cấp đầy đủ thông tin giao dịch theo quy định pháp luật.",
      "Người dùng cam kết không sử dụng nền tảng cho mục đích rửa tiền, tài trợ khủng bố, hoặc bất kỳ hoạt động phi pháp nào.",
      "Vi phạm các quy định AML có thể dẫn đến khóa tài khoản vĩnh viễn và hợp tác xử lý với cơ quan công an.",
      "Sàn có quyền đóng băng giao dịch, tạm giữ tiền, yêu cầu KYC, từ chối thanh toán hoặc từ chối rút tiền khi phát hiện dấu hiệu vi phạm.",
      "Sàn có quyền báo cáo cơ quan chức năng khi phát hiện rửa tiền, tài trợ khủng bố, lừa đảo, giao dịch bất thường hoặc gian lận.",
    ],
    type: "list" as const,
  },
  {
    id: "so-huu-tri-tue",
    title: "Sở hữu trí tuệ & Bản quyền",
    intro: "Nghiêm cấm các hành vi vi phạm sau:",
    items: [
      "Sao chép, tái phân phối, hoặc bán lại sản phẩm số (tài khoản, khóa học, phần mềm, tài nguyên) của thành viên khác trên nền tảng mà không có sự đồng ý bằng văn bản của chủ sở hữu.",
      "Đăng bán phần mềm, khóa học, nội dung số chưa được cấp phép hợp lệ hoặc có nguồn gốc không rõ ràng.",
      "Mọi vi phạm bản quyền có thể bị xử lý theo Luật Sở hữu trí tuệ Việt Nam 2022 và các quy định liên quan.",
      "Chủ sở hữu nội dung có quyền yêu cầu gỡ bỏ sản phẩm vi phạm và yêu cầu bồi thường thiệt hại.",
      "Sàn không chịu trách nhiệm về tranh chấp bản quyền phát sinh từ hành vi vi phạm của người dùng.",
    ],
    type: "list" as const,
    accent: "red" as const,
  },
  {
    id: "luat-ap-dung",
    title: "Luật áp dụng",
    intro: "Nguyên tắc áp dụng luật và giải quyết tranh chấp:",
    items: [
      "Pháp luật Việt Nam là luật áp dụng chính.",
      "Tranh chấp ưu tiên giải quyết bằng thương lượng.",
      "Sau đó thông qua hòa giải.",
      "Cuối cùng đưa ra cơ quan có thẩm quyền tại Việt Nam.",
    ],
    type: "list" as const,
  },
  {
    id: "bat-kha-khang",
    title: "Sự kiện bất khả kháng",
    intro: "Website không chịu trách nhiệm nếu dịch vụ bị ảnh hưởng bởi sự kiện bất khả kháng, bao gồm:",
    items: [
      "Thiên tai, chiến tranh.",
      "Mất điện, lỗi Internet.",
      "Sự cố từ Cloudflare, Google, Meta, Telegram.",
      "Sự cố từ VPS, nhà cung cấp thanh toán.",
      "Sự cố từ nhà cung cấp Email, nhà cung cấp SMS.",
    ],
    type: "list" as const,
  },
  {
    id: "thay-doi",
    title: "Thay đổi điều khoản",
    text: "Chúng tôi có quyền cập nhật điều khoản bất kỳ lúc nào và thông báo trên nền tảng.",
    type: "text" as const,
  },
  {
    id: "cam-ket-phap-ly",
    title: "Cam kết pháp lý",
    intro: "Cam kết chung áp dụng cho toàn bộ nội dung trên nền tảng:",
    items: [
      "Website chỉ cho phép đăng tải, mua bán, trao đổi các sản phẩm, dịch vụ và tài nguyên hợp pháp.",
      "Mọi sản phẩm phải tuân thủ pháp luật Việt Nam, điều ước quốc tế mà Việt Nam là thành viên và không vi phạm quyền của bất kỳ tổ chức, cá nhân nào.",
      "Website có quyền từ chối, ẩn, khóa hoặc gỡ bỏ bất kỳ nội dung nào có dấu hiệu vi phạm pháp luật Việt Nam, pháp luật quốc tế, quyền sở hữu trí tuệ, quyền riêng tư hoặc quy định của các nhà cung cấp dịch vụ bên thứ ba.",
    ],
    type: "list" as const,
  },
];

const TOC = SECTIONS.map((s, i) => ({ id: s.id, label: `${i + 1}. ${s.title}` }));

export default async function DieuKhoanPage() {
  await guardPublicPage("dieu-khoan");
  const contactCms = await getSiteContent<{ quickButtons?: { id: string; label: string; href: string }[] }>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);
  const telegramHref = contactCms.quickButtons?.find((b) => b.id === "telegram")?.href ?? "https://t.me/BossMeta789";
  return (
    <div className="mx-auto max-w-[1100px] px-4 md:px-6 lg:px-8 py-12">

      {/* ── Hero ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[#64748b] mb-4">
          <Link href="/" className="hover:text-[#0066ff] transition-colors">Trang chủ</Link>
          <span>/</span>
          <span className="text-[#0f172a] font-medium">Điều khoản dịch vụ</span>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 mb-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#eff6ff] flex items-center justify-center shrink-0">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0066ff" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0f172a] mb-2">
                Điều Khoản Sử Dụng Sàn MMO
              </h1>
              <p className="text-sm text-[#64748b]">
                Cập nhật lần cuối:{" "}
                <span className="font-semibold text-[#0f172a]">06/06/2026</span>
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
            <p className="text-sm text-[#374151] leading-relaxed">
              Chào mừng bạn đến với nền tảng{" "}
              <span className="font-semibold text-[#0066ff]">MMO Marketplace</span>{" "}
              (&ldquo;Sàn&rdquo;, &ldquo;Chúng tôi&rdquo;). Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên nền tảng, bạn đồng ý tuân thủ toàn bộ Điều khoản sử dụng này.
            </p>
          </div>
        </div>
      </div>

      {/* ── Body: TOC sidebar + Content ── */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* Sidebar TOC */}
        <aside className="lg:sticky lg:top-6 w-full lg:w-64 shrink-0">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5">
            <p className="text-xs font-bold text-[#0f172a] uppercase tracking-widest mb-4">Mục lục</p>
            <nav>
              <ol className="space-y-1">
                {TOC.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block text-sm text-[#64748b] hover:text-[#0066ff] hover:bg-[#eff6ff] rounded-lg px-3 py-2 transition-all leading-snug"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-5">
          {SECTIONS.map((section, idx) => {
            const num = idx + 1;
            const isRed = "accent" in section && section.accent === "red";

            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-xl border border-[#e2e8f0] bg-white overflow-hidden scroll-mt-6"
              >
                {/* Section header */}
                <div
                  className="flex items-center gap-3 px-6 py-4 border-b border-[#f1f5f9]"
                  style={{ background: isRed ? "#fff1f2" : "#f8fafc" }}
                >
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold"
                    style={
                      isRed
                        ? { background: "#fee2e2", color: "#dc2626" }
                        : { background: "#dbeafe", color: "#1d4ed8" }
                    }
                  >
                    {num}
                  </div>
                  <h2
                    className="text-base font-bold"
                    style={{ color: isRed ? "#991b1b" : "#0f172a" }}
                  >
                    {section.title}
                  </h2>
                  {isRed && (
                    <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] shrink-0">
                      Bị cấm
                    </span>
                  )}
                </div>

                {/* Section body */}
                <div className="px-6 py-5">
                  {/* Text type */}
                  {section.type === "text" && (
                    <p className="text-sm text-[#374151] leading-relaxed">{section.text}</p>
                  )}

                  {/* Definition type */}
                  {section.type === "definition" && (
                    <dl className="space-y-3">
                      {section.items.map((def) => (
                        <div key={def.term} className="flex gap-3">
                          <dt className="text-sm font-semibold text-[#0f172a] shrink-0 min-w-[110px]">
                            {def.term}:
                          </dt>
                          <dd className="text-sm text-[#374151] leading-relaxed">{def.def}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* List type */}
                  {section.type === "list" && (
                    <>
                      {"intro" in section && section.intro && (
                        <p className="text-sm text-[#374151] mb-3 font-medium">{section.intro}</p>
                      )}
                      <ul className="space-y-2">
                        {(section.items as string[]).map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <div
                              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                              style={
                                isRed
                                  ? { background: "#fee2e2" }
                                  : { background: "#eff6ff" }
                              }
                            >
                              {isRed ? (
                                <span style={{ color: "#dc2626", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✕</span>
                              ) : (
                                <span style={{ color: "#0066ff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                              )}
                            </div>
                            <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {/* Grouped type */}
                  {section.type === "grouped" && (
                    <div className="space-y-5">
                      {section.groups.map((group) => (
                        <div key={group.label}>
                          <p className="text-sm font-medium text-[#374151] mb-2">{group.label}</p>
                          <ul className="space-y-2 pl-1">
                            {group.items.map((item) => (
                              <li key={item} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 bg-[#eff6ff]">
                                  <span style={{ color: "#0066ff", fontSize: "10px", fontWeight: 700, lineHeight: 1 }}>✓</span>
                                </div>
                                <span className="text-sm text-[#374151] leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* CTA bottom */}
          <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-6 flex flex-col sm:flex-row items-center gap-4 mt-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#1e3a8a] mb-1">Bạn có câu hỏi về điều khoản?</p>
              <p className="text-xs text-[#64748b]">Liên hệ đội ngũ hỗ trợ để được giải đáp nhanh nhất.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-lg bg-[#0066ff] text-white text-sm font-semibold hover:bg-[#0047cc] transition-colors"
              >
                Liên hệ ngay
              </a>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-lg border border-[#bfdbfe] text-[#1d4ed8] text-sm font-medium hover:bg-white transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
