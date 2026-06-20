import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { Toaster } from "@/components/shared/Toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Hệ Thống MMO | DJ MEDIA",
    template: "%s | Hệ Thống MMO | DJ MEDIA",
  },
  description: "Hệ Thống MMO - Nền tảng dịch vụ mạng xã hội hàng đầu Việt Nam, chuyên mở khóa Facebook, khôi phục Fanpage, Facebook Ads, TikTok Ads, khóa học MMO, tài nguyên số và marketplace sản phẩm số. Cung cấp giải pháp marketing online, phát triển thương hiệu cá nhân và kinh doanh số toàn diện, giúp cá nhân và doanh nghiệp tăng trưởng bền vững.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://hethongmmo.vn"),
  openGraph: {
    siteName: "hethongmmo.vn",
    locale: "vi_VN",
    type: "website",
    images: [{ url: "/images/facebook_cover_professional.png", width: 1200, height: 630, alt: "Hệ Thống MMO - DJ MEDIA" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/facebook_cover_professional.png"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {nonce && (
          <meta name="csp-nonce" content={nonce} />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-white text-[#0f172a] font-sans">
        {/* PageTransitionWrapper intentionally NOT here — each route group
            layout wraps only its own <main> content, so the sticky Header
            is never included in the blur/fade animation. */}
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
// Sat Jun 20 15:22:52 SEAST 2026
