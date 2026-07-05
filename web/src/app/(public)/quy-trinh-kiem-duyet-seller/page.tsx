import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Quy Trình Kiểm Duyệt Seller | hethongmmo.vn",
  description: "Quy trình đăng ký, kiểm duyệt và phê duyệt nhà bán hàng trên nền tảng hethongmmo.vn.",
  url: "/quy-trinh-kiem-duyet-seller",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "dieu-kien",
    title: "Điều kiện đăng ký",
    type: "list",
    intro: "Người đăng ký làm nhà bán hàng cần:",
    items: [
      "Có tài khoản đã xác minh danh tính (KYC).",
      "Cung cấp thông tin liên hệ chính xác.",
      "Đồng ý quy chế sàn, điều khoản dịch vụ, chính sách bảo mật và AML.",
      "Cam kết chỉ bán sản phẩm, dịch vụ hợp pháp.",
    ],
  },
  {
    id: "ho-so",
    title: "Hồ sơ cần cung cấp",
    type: "list",
    intro: "Hồ sơ kiểm duyệt bao gồm:",
    items: [
      "Thông tin định danh phục vụ xác minh (KYC).",
      "Thông tin gian hàng và loại sản phẩm dự kiến kinh doanh.",
      "Chứng minh nguồn gốc, quyền sở hữu sản phẩm khi được yêu cầu.",
    ],
  },
  {
    id: "cac-buoc",
    title: "Các bước kiểm duyệt",
    type: "list",
    intro: "Trình tự kiểm duyệt:",
    items: [
      "Bước 1 — Tiếp nhận đăng ký và hồ sơ.",
      "Bước 2 — Xác minh danh tính và thông tin gian hàng.",
      "Bước 3 — Đánh giá loại sản phẩm và mức độ rủi ro.",
      "Bước 4 — Phê duyệt hoặc từ chối kèm lý do.",
    ],
  },
  {
    id: "tieu-chi",
    title: "Tiêu chí phê duyệt",
    type: "list",
    intro: "Nhà bán hàng được duyệt khi:",
    items: [
      "Thông tin chính xác, đầy đủ và có thể xác minh.",
      "Sản phẩm dự kiến kinh doanh hợp pháp.",
      "Không thuộc danh sách tài khoản bị hạn chế hoặc có lịch sử vi phạm.",
    ],
  },
  {
    id: "thoi-gian",
    title: "Thời gian xử lý",
    type: "text",
    text: "Thời gian kiểm duyệt phụ thuộc vào tính đầy đủ của hồ sơ và mức độ rủi ro. Sàn thông báo kết quả qua tài khoản và/hoặc email của người đăng ký.",
  },
  {
    id: "tu-choi-khieu-nai",
    title: "Từ chối & khiếu nại",
    type: "list",
    intro: "Trường hợp bị từ chối:",
    items: [
      "Người đăng ký được thông báo lý do từ chối.",
      "Có thể bổ sung hồ sơ và đăng ký lại.",
      "Có thể khiếu nại quyết định kiểm duyệt qua kênh hỗ trợ.",
    ],
  },
  {
    id: "hau-kiem",
    title: "Hậu kiểm",
    type: "list",
    intro: "Sau khi được duyệt:",
    items: [
      "Sàn tiếp tục giám sát hoạt động và sản phẩm của nhà bán hàng.",
      "Sàn có quyền yêu cầu bổ sung thông tin hoặc tái kiểm duyệt.",
      "Vi phạm phát hiện trong hậu kiểm được xử lý theo chính sách nhà bán hàng.",
    ],
  },
];

export default async function QuyTrinhKiemDuyetSellerPage() {
  await guardPublicPage("quy-trinh-kiem-duyet-seller");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Quy trình kiểm duyệt Seller"
      title="Quy Trình Kiểm Duyệt Seller"
      subtitle="Đăng ký, kiểm duyệt và phê duyệt nhà bán hàng."
      intro="Quy trình này mô tả điều kiện, hồ sơ, các bước và tiêu chí kiểm duyệt nhà bán hàng, cũng như cơ chế từ chối, khiếu nại và hậu kiểm trên nền tảng."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
