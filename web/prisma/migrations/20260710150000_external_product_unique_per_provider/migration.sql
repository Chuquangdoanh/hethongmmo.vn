-- externalId trước đây unique toàn bảng, gây lỗi khi 2 provider khác nhau (vd. khuongfb, muaviaus)
-- có external_id trùng số — giờ unique theo cặp (provider, external_id)
DROP INDEX IF EXISTS "external_products_external_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "external_products_provider_external_id_key"
  ON "external_products"("provider", "external_id");
