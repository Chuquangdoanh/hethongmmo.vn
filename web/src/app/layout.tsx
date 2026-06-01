import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import NavigationProgressLoader from "@/components/layout/NavigationProgressLoader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hệ Thống MMO",
    template: "%s | DJ MEDIA",
  },
  description: "Dịch vụ MXH, khóa học MMO, tài nguyên và marketplace số 1 Việt Nam",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://hethongmmo.vn"),
  openGraph: {
    siteName: "hethongmmo.vn",
    locale: "vi_VN",
    type: "website",
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
        <NavigationProgressLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
