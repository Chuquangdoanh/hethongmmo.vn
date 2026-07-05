import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Chính Sách Thanh Toán | hethongmmo.vn",
  description: "Chính sách thanh toán, nạp tiền, rút tiền và phí trên nền tảng MMO Marketplace hethongmmo.vn.",
  url: "/chinh-sach-thanh-toan",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "phuong-thuc",
    title: "Phương thức thanh toán",
    type: "list",
    intro: "Nền tảng hỗ trợ:",
    items: [
      "Ví nội bộ trên nền tảng.",
      "Chuyển khoản ngân hàng qua cổng thanh toán được hỗ trợ.",
      "Các phương thức thanh toán hợp pháp khác được công bố trên website.",
    ],
  },
  {
    id: "nap-tien",
    title: "Nạp tiền vào ví",
    type: "list",
    intro: "Quy định nạp tiền:",
    items: [
      "Tiền nạp được ghi nhận vào số dư ví nội bộ sau khi hệ thống xác nhận.",
      "Nội dung chuyển khoản phải đúng cú pháp hệ thống cung cấp.",
      "Trường hợp phát sinh thuế/phí nạp, hệ thống sẽ hiển thị rõ trước khi hoàn tất.",
    ],
  },
  {
    id: "thanh-toan-don",
    title: "Quy trình thanh toán đơn hàng",
    type: "list",
    intro: "Khi mua sản phẩm:",
    items: [
      "Số tiền được trừ từ số dư ví nội bộ của người mua.",
      "Giao dịch hoàn tất khi hệ thống xác nhận thành công.",
      "Doanh thu người bán có thể được giữ theo cơ chế escrow trong thời gian khiếu nại.",
    ],
  },
  {
    id: "phi-thue",
    title: "Phí & thuế",
    type: "list",
    intro: "Các khoản phí có thể áp dụng:",
    items: [
      "Phí giao dịch, phí rút tiền, phí dịch vụ bổ sung.",
      "Thuế theo quy định pháp luật (nếu có).",
      "Mọi mức phí được công bố công khai trên website trước khi giao dịch.",
    ],
  },
  {
    id: "hoan-tien",
    title: "Hoàn tiền vào ví",
    type: "list",
    intro: "Nguyên tắc hoàn tiền:",
    items: [
      "Mọi khoản hoàn trả được ghi nhận vào số dư ví nội bộ, không hoàn trực tiếp vào tài khoản ngân hàng.",
      "Số dư ví có thể dùng để mua sản phẩm, dịch vụ khác trên sàn.",
      "Điều kiện hoàn tiền tuân theo chính sách hoàn tiền của nền tảng.",
    ],
  },
  {
    id: "rut-tien",
    title: "Rút tiền",
    type: "list",
    intro: "Quy định rút tiền:",
    items: [
      "Tên tài khoản ngân hàng rút tiền phải khớp với tên đã xác minh danh tính (KYC).",
      "Việc rút số dư về ngân hàng có thể phát sinh phí rút tiền theo quy định.",
      "Sàn có thể giới hạn rút tiền với tài khoản mới hoặc có dấu hiệu bất thường.",
    ],
  },
  {
    id: "bao-mat",
    title: "Bảo mật thanh toán",
    type: "list",
    intro: "Biện pháp bảo mật:",
    items: [
      "Webhook thanh toán được xác thực bằng chữ ký để chống giả mạo.",
      "Nhật ký thanh toán được lưu lại phục vụ đối soát và xử lý tranh chấp.",
      "Không lưu trữ trái phép thông tin nhạy cảm của phương thức thanh toán.",
    ],
  },
  {
    id: "aml",
    title: "Phòng chống rửa tiền (AML)",
    type: "list",
    intro: "Sàn có quyền khi phát hiện dấu hiệu vi phạm:",
    items: [
      "Đóng băng giao dịch, tạm giữ tiền, yêu cầu KYC bổ sung.",
      "Từ chối thanh toán hoặc từ chối rút tiền.",
      "Báo cáo cơ quan chức năng khi phát hiện rửa tiền, tài trợ khủng bố, lừa đảo hoặc giao dịch bất thường.",
    ],
  },
];

export default async function ChinhSachThanhToanPage() {
  await guardPublicPage("chinh-sach-thanh-toan");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Chính sách thanh toán"
      title="Chính Sách Thanh Toán"
      subtitle="Quy định về nạp tiền, thanh toán, phí, hoàn tiền và rút tiền."
      intro="Chính sách thanh toán quy định các phương thức thanh toán, quy trình nạp/rút tiền, phí, thuế, hoàn tiền và các biện pháp bảo mật, phòng chống rửa tiền trên nền tảng."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
