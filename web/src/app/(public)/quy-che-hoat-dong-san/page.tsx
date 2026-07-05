import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Quy Chế Hoạt Động Sàn | hethongmmo.vn",
  description: "Quy chế hoạt động sàn giao dịch thương mại điện tử MMO Marketplace hethongmmo.vn.",
  url: "/quy-che-hoat-dong-san",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "pham-vi",
    title: "Phạm vi & đối tượng áp dụng",
    type: "list",
    intro: "Quy chế này áp dụng cho:",
    items: [
      "Sàn giao dịch với vai trò trung gian kết nối Người bán và Người mua.",
      "Người bán đăng bán sản phẩm, dịch vụ số hợp pháp trên nền tảng.",
      "Người mua truy cập, đặt mua sản phẩm, dịch vụ trên nền tảng.",
      "Mọi giao dịch, tương tác phát sinh trong phạm vi nền tảng.",
    ],
  },
  {
    id: "nguyen-tac",
    title: "Nguyên tắc hoạt động",
    type: "list",
    intro: "Sàn vận hành trên các nguyên tắc:",
    items: [
      "Tự nguyện, bình đẳng, trung thực và thiện chí giữa các bên.",
      "Công khai, minh bạch về phí, quy trình và chính sách.",
      "Chỉ cho phép giao dịch sản phẩm, dịch vụ hợp pháp.",
      "Tuân thủ pháp luật Việt Nam và điều ước quốc tế mà Việt Nam là thành viên.",
      "Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.",
    ],
  },
  {
    id: "quyen-nghia-vu-san",
    title: "Quyền & nghĩa vụ của sàn",
    type: "grouped",
    groups: [
      {
        label: "Sàn có quyền:",
        items: [
          "Kiểm duyệt, ẩn, gỡ nội dung có dấu hiệu vi phạm.",
          "Tạm giữ thanh toán để xác minh khi có tranh chấp.",
          "Khóa tài khoản vi phạm và hợp tác với cơ quan chức năng.",
        ],
      },
      {
        label: "Sàn có nghĩa vụ:",
        items: [
          "Duy trì hệ thống kỹ thuật ổn định, an toàn.",
          "Công bố công khai chính sách, phí và quy trình.",
          "Tiếp nhận và xử lý khiếu nại, tranh chấp theo quy định.",
        ],
      },
    ],
  },
  {
    id: "quyen-nghia-vu-ban",
    title: "Quyền & nghĩa vụ người bán",
    type: "list",
    intro: "Người bán:",
    items: [
      "Cung cấp thông tin sản phẩm chính xác, trung thực.",
      "Chịu trách nhiệm về bản quyền, nguồn gốc và tính hợp pháp của sản phẩm.",
      "Giao sản phẩm và hỗ trợ, bảo hành đúng cam kết.",
      "Không thực hiện hành vi gian lận, thao túng hệ thống.",
    ],
  },
  {
    id: "quyen-nghia-vu-mua",
    title: "Quyền & nghĩa vụ người mua",
    type: "list",
    intro: "Người mua:",
    items: [
      "Cung cấp thông tin chính xác khi giao dịch.",
      "Thanh toán đầy đủ theo giá công bố.",
      "Được khiếu nại trong thời hạn quy định khi sản phẩm có lỗi.",
      "Không lạm dụng chính sách hoàn tiền, bảo hành để trục lợi.",
    ],
  },
  {
    id: "co-che-giao-dich",
    title: "Cơ chế giao dịch & thanh toán",
    type: "list",
    intro: "Quy trình giao dịch trên sàn:",
    items: [
      "Mọi giao dịch được thực hiện thông qua hệ thống của sàn.",
      "Thanh toán qua ví nội bộ và các cổng thanh toán được hỗ trợ.",
      "Doanh thu người bán có thể được giữ theo cơ chế escrow trong thời gian khiếu nại.",
      "Phí giao dịch được công bố công khai trên website.",
    ],
  },
  {
    id: "xu-ly-vi-pham",
    title: "Xử lý vi phạm",
    type: "list",
    accent: "red",
    intro: "Tùy mức độ, sàn có thể áp dụng đồng thời:",
    items: [
      "Cảnh báo, ẩn hoặc khóa sản phẩm.",
      "Đóng băng doanh thu, khóa ví.",
      "Khóa tài khoản tạm thời hoặc vĩnh viễn.",
      "Chuyển hồ sơ cho cơ quan chức năng khi có dấu hiệu vi phạm pháp luật.",
    ],
  },
];

export default async function QuyCheHoatDongSanPage() {
  await guardPublicPage("quy-che-hoat-dong-san");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Quy chế hoạt động sàn"
      title="Quy Chế Hoạt Động Sàn"
      subtitle="Quy chế vận hành sàn giao dịch thương mại điện tử hethongmmo.vn."
      intro="Quy chế hoạt động sàn quy định nguyên tắc vận hành, quyền và nghĩa vụ của sàn, người bán và người mua, cơ chế giao dịch cũng như cách xử lý vi phạm trên nền tảng MMO Marketplace."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
