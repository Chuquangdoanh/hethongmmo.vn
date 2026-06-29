export const KHUONGFB_BASE_URL = "https://khuongfb.com/api";
export const KHUONGFB_TIMEOUT_MS = 15_000;

export const KHUONGFB_ENDPOINTS = {
  profile:  "/profile.php",
  products: "/products.php",
  product:  "/product.php",
  order:    "/order.php",
  buy:      "/buy_product",
} as const;

export const KHUONGFB_SOURCE = "khuongfb" as const;

// Cron interval in minutes (dùng trong vercel.json / cron config)
export const KHUONGFB_SYNC_INTERVAL_MINUTES = 15;
