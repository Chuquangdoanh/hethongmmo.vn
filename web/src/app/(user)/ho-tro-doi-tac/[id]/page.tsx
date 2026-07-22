import { redirect } from "next/navigation";

// Chat gian hàng đối tác đã được gộp vào trang hỗ trợ chung /ho-tro (tiền tố ps-).
// Giữ route cũ để redirect các link/bookmark cũ.
export default async function PartnerSupportRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ho-tro?id=ps-${id}`);
}
