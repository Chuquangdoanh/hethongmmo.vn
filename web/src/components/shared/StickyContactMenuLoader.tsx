import { getSiteContent, SITE_CONTENT_KEYS } from "@/lib/services/site-content.service";
import StickyContactMenu, { type ContactSupportData } from "./StickyContactMenu";

export default async function StickyContactMenuLoader() {
  const cmsData = await getSiteContent<ContactSupportData>(SITE_CONTENT_KEYS.CONTACT_SUPPORT);
  return <StickyContactMenu cmsData={cmsData} />;
}
