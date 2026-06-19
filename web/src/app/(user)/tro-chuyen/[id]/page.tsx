import { redirect } from "next/navigation";

export default async function TroChuyenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/ho-tro?id=${id}`);
}
