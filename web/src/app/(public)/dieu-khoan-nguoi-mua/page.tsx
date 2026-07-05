import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Điều Khoản Dành Cho Người Mua | hethongmmo.vn",
  description: "Điều khoản, quyền và trách nhiệm của người mua trên nền tảng MMO Marketplace hethongmmo.vn.",
  url: "/dieu-khoan-nguoi-mua",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "dieu-kien",
    title: "Điều kiện mua hàng",
    type: "list",
    intro: "Người mua cần:",
    items: [
      "Từ đủ 18 tuổi hoặc được người giám hộ hợp pháp cho phép.",
      "Có tài khoản hợp lệ và cung cấp thông tin chính xác.",
      "Đồng ý với điều khoản dịch vụ và các chính sách của nền tảng.",
    ],
  },
  {
    id: "trach-nhiem",
    title: "Trách nhiệm của người mua",
    type: "list",
    intro: "Người mua có trách nhiệm:",
    items: [
      "Bảo mật thông tin tài khoản của mình.",
      "Kiểm tra kỹ mô tả, điều kiện sử dụng sản phẩm trước khi mua.",
      "Sử dụng sản phẩm đúng mục đích và đúng pháp luật.",
      "Không lạm dụng chính sách hoàn tiền, bảo hành để trục lợi.",
    ],
  },
  {
    id: "dat-nhan-hang",
    title: "Quy trình đặt & nhận hàng",
    type: "list",
    intro: "Khi giao dịch:",
    items: [
      "Thanh toán được trừ từ số dư ví nội bộ khi đặt hàng.",
      "Sản phẩm số được bàn giao qua hệ thống sau khi thanh toán thành công.",
      "Người mua kiểm tra sản phẩm ngay khi nhận để phát hiện lỗi kịp thời.",
    ],
  },
  {
    id: "bao-hanh-khieu-nai",
    title: "Bảo hành & khiếu nại",
    type: "list",
    intro: "Quyền khiếu nại:",
    items: [
      "Khiếu nại trong thời hạn quy định theo loại sản phẩm.",
      "Cung cấp bằng chứng cụ thể (ảnh, video, log lỗi).",
      "Không tự ý thay đổi thông tin tài khoản trước khi báo lỗi.",
    ],
  },
  {
    id: "hoan-tien",
    title: "Hoàn tiền",
    type: "grouped",
    groups: [
      {
        label: "Được hoàn khi:",
        items: [
          "Không nhận được sản phẩm.",
          "Sản phẩm sai, không đúng mô tả hoặc không sử dụng được.",
          "Người bán không bàn giao theo cam kết.",
        ],
      },
      {
        label: "Không hoàn khi:",
        items: [
          "Người mua đổi ý hoặc mua nhầm.",
          "Người mua tự khóa tài khoản hoặc thay đổi thông tin tài khoản.",
          "Người mua vi phạm điều khoản sử dụng.",
        ],
        accent: "red",
      },
    ],
  },
  {
    id: "hanh-vi-cam",
    title: "Hành vi bị cấm",
    type: "list",
    accent: "red",
    intro: "Người mua không được:",
    items: [
      "Sử dụng sản phẩm cho mục đích vi phạm pháp luật.",
      "Gian lận thanh toán hoặc lạm dụng khuyến mãi.",
      "Tạo khiếu nại giả để chiếm đoạt sản phẩm hoặc tiền hoàn.",
      "Quấy rối, đe dọa người bán hoặc nhân sự hỗ trợ.",
    ],
  },
  {
    id: "gioi-han-trach-nhiem",
    title: "Giới hạn trách nhiệm",
    type: "text",
    text: "Sàn đóng vai trò trung gian kết nối và không chịu trách nhiệm với thiệt hại phát sinh từ việc người mua sử dụng sản phẩm sai mục đích, thỏa thuận ngoài hệ thống hoặc vi phạm chính sách của nhà cung cấp dịch vụ bên thứ ba.",
  },
];

export default async function DieuKhoanNguoiMuaPage() {
  await guardPublicPage("dieu-khoan-nguoi-mua");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Điều khoản dành cho người mua"
      title="Điều Khoản Dành Cho Người Mua"
      subtitle="Quyền, trách nhiệm và quy trình giao dịch của người mua."
      intro="Điều khoản này quy định điều kiện, trách nhiệm, quy trình mua hàng, bảo hành, hoàn tiền và các hành vi bị cấm đối với người mua trên nền tảng."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
