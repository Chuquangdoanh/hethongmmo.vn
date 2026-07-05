import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Quy Trình Gỡ Sản Phẩm | hethongmmo.vn",
  description: "Căn cứ và quy trình gỡ bỏ sản phẩm vi phạm trên nền tảng MMO Marketplace hethongmmo.vn.",
  url: "/quy-trinh-go-san-pham",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "can-cu",
    title: "Căn cứ gỡ sản phẩm",
    type: "list",
    intro: "Sản phẩm có thể bị gỡ khi:",
    items: [
      "Vi phạm pháp luật Việt Nam hoặc điều ước quốc tế.",
      "Vi phạm quyền sở hữu trí tuệ của bên thứ ba.",
      "Thông tin sai sự thật, gây hiểu nhầm cho người mua.",
      "Thuộc danh mục sản phẩm bị cấm của nền tảng.",
    ],
  },
  {
    id: "go-ngay",
    title: "Sản phẩm bị gỡ ngay",
    type: "list",
    accent: "red",
    intro: "Gỡ ngay không cần thông báo trước:",
    items: [
      "Sản phẩm bị đánh cắp (nick hack, cookie, token, session).",
      "Malware, virus, tool tấn công, phishing kit.",
      "Dữ liệu cá nhân, giấy tờ, thông tin ngân hàng trái phép.",
      "Sản phẩm phục vụ lừa đảo hoặc gây nguy hại nghiêm trọng.",
    ],
  },
  {
    id: "quy-trinh",
    title: "Quy trình gỡ",
    type: "list",
    intro: "Trình tự xử lý:",
    items: [
      "Tiếp nhận báo cáo hoặc phát hiện qua hệ thống giám sát.",
      "Xác minh dấu hiệu vi phạm.",
      "Ẩn hoặc gỡ sản phẩm khỏi gian hàng.",
      "Ghi nhận nhật ký xử lý phục vụ đối soát.",
    ],
  },
  {
    id: "thong-bao",
    title: "Thông báo cho người bán",
    type: "list",
    intro: "Sau khi gỡ:",
    items: [
      "Người bán được thông báo về việc gỡ và lý do (trừ trường hợp gỡ ngay).",
      "Người bán có thể bổ sung thông tin, bằng chứng hợp lệ.",
      "Doanh thu liên quan có thể bị tạm giữ để xác minh.",
    ],
  },
  {
    id: "khieu-nai",
    title: "Khiếu nại quyết định gỡ",
    type: "list",
    intro: "Nếu không đồng ý:",
    items: [
      "Người bán gửi khiếu nại kèm bằng chứng qua kênh hỗ trợ.",
      "Sàn xem xét lại và phản hồi kết quả.",
      "Sản phẩm được khôi phục nếu chứng minh không vi phạm.",
    ],
  },
  {
    id: "xu-ly-sau",
    title: "Xử lý sau gỡ",
    type: "list",
    intro: "Tùy mức độ vi phạm:",
    items: [
      "Cảnh báo hoặc hạn chế đăng bán.",
      "Khóa sản phẩm, khóa ví hoặc khóa tài khoản.",
      "Chuyển hồ sơ cho cơ quan chức năng khi có dấu hiệu vi phạm pháp luật.",
    ],
  },
];

export default async function QuyTrinhGoSanPhamPage() {
  await guardPublicPage("quy-trinh-go-san-pham");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Quy trình gỡ sản phẩm"
      title="Quy Trình Gỡ Sản Phẩm"
      subtitle="Căn cứ, trình tự và xử lý khi gỡ bỏ sản phẩm vi phạm."
      intro="Quy trình này quy định căn cứ, trình tự gỡ bỏ sản phẩm vi phạm, việc thông báo cho người bán, cơ chế khiếu nại và các biện pháp xử lý sau khi gỡ."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
