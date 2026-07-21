import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import type { AuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import PartnerChatPanel from "@/components/shared/PartnerChatPanel";
import type { PartnerChatMessage } from "@/components/shared/PartnerChatPanel";

export const metadata: Metadata = { title: "Chat gian hàng đối tác" };

export default async function PartnerSupportChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user as AuthenticatedUser | undefined;
  if (!me) redirect("/dang-nhap");

  const thread = await prisma.partnerSupportThread.findUnique({
    where: { id },
    select: {
      id: true, userId: true, subject: true, providerName: true, status: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderId: true, senderName: true, senderRole: true, content: true, createdAt: true },
      },
    },
  });
  if (!thread || thread.userId !== me.id) notFound();

  const messages: PartnerChatMessage[] = thread.messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
      <Link
        href="/don-hang"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={15} /> Về đơn hàng
      </Link>

      <PartnerChatPanel
        threadId={thread.id}
        currentUserId={me.id}
        providerName={thread.providerName}
        subject={thread.subject}
        initialMessages={messages}
        initialStatus={thread.status}
      />
    </div>
  );
}
