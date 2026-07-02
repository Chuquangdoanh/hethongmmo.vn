-- AlterTable
ALTER TABLE "affiliate_commission_rules" ADD COLUMN     "order_type" "OrderType";

-- CreateIndex
CREATE INDEX "affiliate_commission_rules_order_type_idx" ON "affiliate_commission_rules"("order_type");

