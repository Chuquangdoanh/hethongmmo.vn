import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Chính Sách Xử Lý Dữ Liệu Cá Nhân | hethongmmo.vn",
  description: "Chính sách xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP trên nền tảng hethongmmo.vn.",
  url: "/chinh-sach-xu-ly-du-lieu-ca-nhan",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "can-cu",
    title: "Căn cứ pháp lý",
    type: "list",
    intro: "Chính sách được xây dựng trên cơ sở:",
    items: [
      "Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.",
      "Luật An ninh mạng.",
      "Luật Giao dịch điện tử.",
      "Các điều ước quốc tế mà Việt Nam là thành viên.",
    ],
  },
  {
    id: "du-lieu-xu-ly",
    title: "Dữ liệu cá nhân được xử lý",
    type: "list",
    intro: "Sàn có thể xử lý các dữ liệu:",
    items: [
      "Họ tên, email, số điện thoại, ảnh đại diện.",
      "Thông tin tài khoản và thông tin xác minh danh tính (KYC).",
      "Lịch sử giao dịch, thanh toán, đơn hàng.",
      "IP, Device ID, trình duyệt, cookie, nhật ký hoạt động.",
      "Nhật ký đăng nhập, giao dịch, API và thanh toán.",
    ],
  },
  {
    id: "muc-dich",
    title: "Mục đích xử lý",
    type: "list",
    intro: "Dữ liệu được xử lý nhằm:",
    items: [
      "Cung cấp và vận hành dịch vụ.",
      "Xử lý thanh toán và giao dịch.",
      "Phòng chống gian lận, rửa tiền.",
      "Hỗ trợ khách hàng và giải quyết tranh chấp.",
      "Tuân thủ yêu cầu của pháp luật.",
    ],
  },
  {
    id: "co-so-phap-ly",
    title: "Cơ sở pháp lý của việc xử lý",
    type: "list",
    intro: "Việc xử lý dữ liệu dựa trên:",
    items: [
      "Sự đồng ý của chủ thể dữ liệu.",
      "Thực hiện hợp đồng, giao dịch với chủ thể dữ liệu.",
      "Nghĩa vụ tuân thủ pháp luật của sàn.",
      "Lợi ích hợp pháp trong phòng chống gian lận và bảo đảm an ninh hệ thống.",
    ],
  },
  {
    id: "quyen-chu-the",
    title: "Quyền của chủ thể dữ liệu",
    type: "list",
    intro: "Chủ thể dữ liệu có quyền:",
    items: [
      "Được biết và truy cập dữ liệu cá nhân của mình.",
      "Yêu cầu xuất, chỉnh sửa hoặc xóa dữ liệu.",
      "Yêu cầu hạn chế xử lý dữ liệu.",
      "Rút lại sự đồng ý đã cung cấp.",
      "Khiếu nại về việc xử lý dữ liệu cá nhân.",
    ],
  },
  {
    id: "bao-mat-luu-tru",
    title: "Bảo mật & thời gian lưu trữ",
    type: "list",
    intro: "Biện pháp bảo vệ và lưu trữ:",
    items: [
      "Mã hóa dữ liệu, xác thực nhiều lớp và kiểm soát truy cập nội bộ.",
      "Giám sát an ninh hệ thống liên tục.",
      "Dữ liệu được lưu trong thời gian tài khoản hoạt động và theo thời hạn pháp luật yêu cầu.",
      "Dữ liệu giao dịch, log, thanh toán, bảo hành lưu theo quy định pháp luật Việt Nam.",
    ],
  },
  {
    id: "chuyen-quoc-te",
    title: "Chuyển dữ liệu quốc tế",
    type: "list",
    intro: "Trong trường hợp sử dụng hạ tầng quốc tế (Cloudflare, AWS, Google Cloud, Azure, DigitalOcean, Hetzner, OVH, VPS quốc tế), dữ liệu có thể được xử lý tại máy chủ nước ngoài nhưng vẫn tuân thủ pháp luật Việt Nam:",
    items: [
      "Việc chuyển dữ liệu tuân thủ Nghị định 13/2023/NĐ-CP.",
      "Đối tác xử lý dữ liệu phải bảo đảm biện pháp bảo vệ tương đương.",
      "Chủ thể dữ liệu được thông báo về việc chuyển dữ liệu ra nước ngoài khi pháp luật yêu cầu.",
    ],
  },
  {
    id: "lien-he",
    title: "Liên hệ về dữ liệu",
    type: "text",
    text: "Mọi yêu cầu liên quan đến dữ liệu cá nhân (truy cập, chỉnh sửa, xóa, hạn chế xử lý, rút lại đồng ý, khiếu nại) được gửi tới bộ phận pháp lý & bảo mật qua email support@hethongmmo.vn.",
  },
];

export default async function ChinhSachXuLyDuLieuCaNhanPage() {
  await guardPublicPage("chinh-sach-xu-ly-du-lieu-ca-nhan");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Chính sách xử lý dữ liệu cá nhân"
      title="Chính Sách Xử Lý Dữ Liệu Cá Nhân"
      subtitle="Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân."
      intro="Chính sách này mô tả cách nền tảng thu thập, sử dụng, lưu trữ, chuyển giao và bảo vệ dữ liệu cá nhân, cũng như quyền của chủ thể dữ liệu theo pháp luật Việt Nam."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
