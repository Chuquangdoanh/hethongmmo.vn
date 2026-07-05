import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Chính Sách Giải Quyết Tranh Chấp | hethongmmo.vn",
  description: "Quy trình và nguyên tắc giải quyết tranh chấp giữa người mua và người bán trên hethongmmo.vn.",
  url: "/chinh-sach-giai-quyet-tranh-chap",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "pham-vi",
    title: "Phạm vi áp dụng",
    type: "list",
    intro: "Chính sách áp dụng cho tranh chấp phát sinh từ:",
    items: [
      "Giao dịch giữa người mua và người bán trên nền tảng.",
      "Chất lượng, bàn giao, bảo hành sản phẩm, dịch vụ.",
      "Thanh toán, hoàn tiền và doanh thu.",
    ],
  },
  {
    id: "nguyen-tac",
    title: "Nguyên tắc giải quyết",
    type: "list",
    intro: "Việc giải quyết tranh chấp dựa trên:",
    items: [
      "Trung thực, thiện chí và tôn trọng quyền lợi hợp pháp của các bên.",
      "Dựa trên bằng chứng và dữ liệu giao dịch được ghi nhận trong hệ thống.",
      "Tuân thủ pháp luật Việt Nam.",
    ],
  },
  {
    id: "cac-buoc",
    title: "Các bước giải quyết",
    type: "list",
    intro: "Trình tự giải quyết tranh chấp:",
    items: [
      "Bước 1 — Thương lượng trực tiếp giữa người mua và người bán.",
      "Bước 2 — Hòa giải với sự hỗ trợ của bộ phận hỗ trợ sàn.",
      "Bước 3 — Hệ thống trọng tài nội bộ ra quyết định dựa trên bằng chứng.",
      "Bước 4 — Đưa ra cơ quan có thẩm quyền tại Việt Nam nếu không đạt được thỏa thuận.",
    ],
  },
  {
    id: "thoi-han",
    title: "Thời hạn khiếu nại",
    type: "list",
    intro: "Thời hạn theo loại sản phẩm:",
    items: [
      "Sản phẩm số (tài khoản, tài nguyên, via, clone, source code): 2 giờ kể từ khi nhận.",
      "Dịch vụ dài hạn (Website, Hosting, Khóa học, VPS): 7 ngày kể từ khi bàn giao.",
      "Quá thời hạn khiếu nại, giao dịch được xem là hoàn tất.",
    ],
  },
  {
    id: "bang-chung",
    title: "Bằng chứng & hợp tác",
    type: "list",
    intro: "Yêu cầu về bằng chứng:",
    items: [
      "Khiếu nại phải kèm bằng chứng cụ thể (ảnh chụp màn hình, video, log lỗi).",
      "Các bên cung cấp thông tin trong vòng 24 giờ kể từ khi được yêu cầu.",
      "Sàn có quyền tạm giữ thanh toán để xác minh khi nghi ngờ gian lận.",
    ],
  },
  {
    id: "quyet-dinh",
    title: "Quyết định & thực thi",
    type: "list",
    intro: "Kết quả xử lý:",
    items: [
      "Quyết định của hệ thống trọng tài nội bộ là căn cứ xử lý cuối cùng trên nền tảng.",
      "Sàn có thể điều chỉnh doanh thu, hoàn tiền vào ví theo kết quả xử lý.",
      "Kết quả được thông báo tới các bên liên quan.",
    ],
  },
  {
    id: "luat-ap-dung",
    title: "Luật áp dụng",
    type: "text",
    text: "Pháp luật Việt Nam là luật áp dụng chính cho mọi tranh chấp. Tranh chấp ưu tiên giải quyết bằng thương lượng, sau đó hòa giải, cuối cùng đưa ra cơ quan có thẩm quyền tại Việt Nam.",
  },
];

export default async function ChinhSachGiaiQuyetTranhChapPage() {
  await guardPublicPage("chinh-sach-giai-quyet-tranh-chap");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Chính sách giải quyết tranh chấp"
      title="Chính Sách Giải Quyết Tranh Chấp"
      subtitle="Quy trình xử lý tranh chấp giữa người mua và người bán."
      intro="Chính sách này quy định nguyên tắc, trình tự và thời hạn giải quyết tranh chấp phát sinh trong giao dịch trên nền tảng, từ thương lượng, hòa giải đến trọng tài nội bộ và cơ quan có thẩm quyền."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
