import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Chính Sách Xử Lý Khiếu Nại | hethongmmo.vn",
  description: "Quy trình tiếp nhận và xử lý khiếu nại của người dùng trên nền tảng hethongmmo.vn.",
  url: "/chinh-sach-xu-ly-khieu-nai",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "kenh-tiep-nhan",
    title: "Kênh tiếp nhận khiếu nại",
    type: "list",
    intro: "Người dùng có thể gửi khiếu nại qua:",
    items: [
      "Chức năng khiếu nại/hỗ trợ trong tài khoản trên nền tảng.",
      "Email: support@hethongmmo.vn.",
      "Kênh hỗ trợ Telegram chính thức của nền tảng.",
    ],
  },
  {
    id: "thoi-han",
    title: "Thời hạn khiếu nại",
    type: "list",
    intro: "Thời hạn gửi khiếu nại:",
    items: [
      "Sản phẩm số: trong vòng 2 giờ kể từ khi nhận sản phẩm.",
      "Dịch vụ dài hạn: trong vòng 7 ngày kể từ khi bàn giao.",
      "Khiếu nại ngoài thời hạn có thể không được thụ lý.",
    ],
  },
  {
    id: "quy-trinh",
    title: "Quy trình xử lý",
    type: "list",
    intro: "Các bước xử lý khiếu nại:",
    items: [
      "Tiếp nhận và ghi nhận khiếu nại kèm bằng chứng.",
      "Xác minh thông tin với các bên liên quan.",
      "Đưa ra hướng xử lý dựa trên dữ liệu giao dịch và bằng chứng.",
      "Thông báo kết quả cho người khiếu nại.",
    ],
  },
  {
    id: "thoi-gian-phan-hoi",
    title: "Thời gian phản hồi",
    type: "list",
    intro: "Cam kết thời gian:",
    items: [
      "Phản hồi tiếp nhận trong thời gian sớm nhất kể từ khi nhận khiếu nại.",
      "Các bên cung cấp thông tin bổ sung trong vòng 24 giờ khi được yêu cầu.",
      "Thời gian xử lý tùy mức độ phức tạp của vụ việc.",
    ],
  },
  {
    id: "ket-qua",
    title: "Kết quả xử lý",
    type: "list",
    intro: "Kết quả có thể bao gồm:",
    items: [
      "Hoàn tiền vào ví nội bộ hoặc đổi/bảo hành sản phẩm.",
      "Điều chỉnh doanh thu hoặc xử lý người bán vi phạm.",
      "Từ chối khiếu nại nếu không đủ căn cứ.",
    ],
  },
  {
    id: "leo-thang",
    title: "Khiếu nại lần hai & leo thang",
    type: "list",
    intro: "Nếu chưa đồng ý với kết quả:",
    items: [
      "Người dùng có thể yêu cầu xem xét lại kèm bằng chứng mới.",
      "Vụ việc được chuyển lên cấp xử lý cao hơn của nền tảng.",
      "Cuối cùng có thể đưa ra cơ quan có thẩm quyền tại Việt Nam.",
    ],
  },
];

export default async function ChinhSachXuLyKhieuNaiPage() {
  await guardPublicPage("chinh-sach-xu-ly-khieu-nai");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Chính sách xử lý khiếu nại"
      title="Chính Sách Xử Lý Khiếu Nại"
      subtitle="Kênh tiếp nhận, quy trình và thời gian xử lý khiếu nại."
      intro="Chính sách này quy định cách người dùng gửi khiếu nại, thời hạn, quy trình xử lý, thời gian phản hồi và cơ chế leo thang khi chưa đồng ý với kết quả."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
