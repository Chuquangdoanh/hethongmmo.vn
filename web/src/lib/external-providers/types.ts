import type Decimal from "decimal.js";
import type { Prisma } from "@prisma/client";

export interface NormalizedProduct {
  externalId:       string;
  externalCategory: string;
  name:             string;
  description:      string | null;
  thumbnail:        string | null;
  originalPrice:    Decimal;
  rawData:          Prisma.InputJsonValue;
}

export interface BuyResult {
  externalOrderId: string;
  data:            Prisma.InputJsonValue | null;
}

export interface ExternalOrderStatus {
  status:      string;
  transId?:    string;
  remains?:    number;
  startCount?: number;
}

export interface ExternalProductProvider {
  readonly providerId: string;
  getProducts(): Promise<NormalizedProduct[]>;
  buyProduct(externalId: string, quantity: number): Promise<BuyResult>;
  getOrder(externalOrderId: string): Promise<ExternalOrderStatus>;
}

export interface SyncResult {
  created:     number;
  updated:     number;
  deactivated: number;
  total:       number;
  syncedAt:    Date;
  durationMs:  number;
}
