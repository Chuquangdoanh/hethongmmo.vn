import { syncProvider } from "@/lib/external-providers/sync.service";
import { khuongfbAdapter } from "./adapter";

export type { SyncResult } from "@/lib/external-providers/types";

export async function syncKhuongfbProducts() {
  return syncProvider(khuongfbAdapter);
}
