import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import FooterClient from "./FooterClient";

export default async function Footer() {
  const data = await getSiteContent<Record<string, unknown>>(SITE_CONTENT_KEYS.FOOTER);
  return <FooterClient data={data} />;
}
