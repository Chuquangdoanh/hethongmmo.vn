import type { Metadata } from "next";
import { guardPublicPage } from "@/lib/utils/public-page-guard";
import { getSupportTelegramHref } from "@/lib/utils/support-contact";
import { buildMeta } from "@/lib/utils/seo";
import LegalDoc, { type LegalSection } from "../_components/LegalDoc";

export const metadata: Metadata = buildMeta({
  title: "Chính Sách Sở Hữu Trí Tuệ | hethongmmo.vn",
  description: "Chính sách bảo vệ quyền sở hữu trí tuệ và xử lý vi phạm bản quyền trên hethongmmo.vn.",
  url: "/chinh-sach-so-huu-tri-tue",
  image: "/images/hethong.png",
});

const SECTIONS: LegalSection[] = [
  {
    id: "cam-ket",
    title: "Cam kết tôn trọng sở hữu trí tuệ",
    type: "list",
    intro: "Nền tảng cam kết:",
    items: [
      "Tôn trọng quyền sở hữu trí tuệ theo Luật Sở hữu trí tuệ Việt Nam.",
      "Chỉ cho phép đăng bán nội dung có nguồn gốc, quyền sở hữu hợp pháp.",
      "Xử lý kịp thời các báo cáo vi phạm bản quyền hợp lệ.",
    ],
  },
  {
    id: "hanh-vi-cam",
    title: "Hành vi vi phạm bị cấm",
    type: "list",
    accent: "red",
    intro: "Nghiêm cấm:",
    items: [
      "Sao chép, tái phân phối, bán lại sản phẩm số của người khác khi chưa được phép.",
      "Đăng bán phần mềm, khóa học, nội dung số chưa được cấp phép hợp lệ.",
      "Sử dụng thương hiệu, logo, nội dung của bên thứ ba trái phép.",
      "Kinh doanh sản phẩm có nguồn gốc không rõ ràng.",
    ],
  },
  {
    id: "bao-cao",
    title: "Quy trình báo cáo vi phạm",
    type: "list",
    intro: "Chủ sở hữu quyền có thể báo cáo kèm:",
    items: [
      "Thông tin về nội dung được cho là vi phạm (đường dẫn sản phẩm).",
      "Bằng chứng về quyền sở hữu hợp pháp.",
      "Thông tin liên hệ của người báo cáo.",
      "Gửi tới email: support@hethongmmo.vn.",
    ],
  },
  {
    id: "xu-ly",
    title: "Xử lý khi có báo cáo",
    type: "list",
    intro: "Sau khi nhận báo cáo hợp lệ:",
    items: [
      "Sàn xác minh thông tin và bằng chứng.",
      "Ẩn hoặc gỡ sản phẩm vi phạm khỏi gian hàng.",
      "Thông báo cho người bán về việc xử lý và lý do.",
    ],
  },
  {
    id: "phan-hoi",
    title: "Phản hồi & khôi phục",
    type: "list",
    intro: "Người bán bị gỡ có quyền:",
    items: [
      "Gửi phản hồi kèm bằng chứng chứng minh quyền hợp pháp.",
      "Yêu cầu khôi phục sản phẩm nếu chứng minh không vi phạm.",
      "Chịu trách nhiệm pháp lý về tính chính xác của thông tin phản hồi.",
    ],
  },
  {
    id: "tai-pham",
    title: "Xử lý tái phạm",
    type: "list",
    accent: "red",
    intro: "Với hành vi tái phạm:",
    items: [
      "Khóa sản phẩm và hạn chế đăng bán.",
      "Khóa tài khoản nhà bán hàng.",
      "Chuyển hồ sơ cho cơ quan chức năng khi cần thiết.",
    ],
  },
  {
    id: "mien-tru",
    title: "Miễn trừ của sàn",
    type: "text",
    text: "Sàn đóng vai trò trung gian và không chịu trách nhiệm về tranh chấp bản quyền phát sinh từ hành vi vi phạm của người dùng. Người đăng bán chịu trách nhiệm về tính hợp pháp và quyền sở hữu đối với nội dung của mình.",
  },
];

export default async function ChinhSachSoHuuTriTuePage() {
  await guardPublicPage("chinh-sach-so-huu-tri-tue");
  const telegramHref = await getSupportTelegramHref();
  return (
    <LegalDoc
      breadcrumb="Chính sách sở hữu trí tuệ"
      title="Chính Sách Sở Hữu Trí Tuệ"
      subtitle="Bảo vệ quyền sở hữu trí tuệ và xử lý vi phạm bản quyền."
      intro="Chính sách này quy định cam kết tôn trọng sở hữu trí tuệ, các hành vi vi phạm bị cấm, quy trình báo cáo và xử lý vi phạm bản quyền trên nền tảng."
      sections={SECTIONS}
      telegramHref={telegramHref}
    />
  );
}
