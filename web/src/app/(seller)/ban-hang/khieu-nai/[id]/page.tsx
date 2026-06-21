import { redirect } from "next/navigation";

export default async function SellerKhieuNaiDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ban-hang/khieu-nai?id=${id}`);
}
