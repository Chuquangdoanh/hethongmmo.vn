// ⚠️ FILE NÀY CHỈ DÙNG ĐỂ TEST — XÓA SAU KHI XÁC NHẬN API HOẠT ĐỘNG
// Truy cập: http://localhost:3000/api/test/khuongfb

import { NextResponse } from "next/server";
import { KHUONGFB_BASE_URL, KHUONGFB_ENDPOINTS, KHUONGFB_TIMEOUT_MS } from "@/lib/khuongfb/constants";
import { khuongfbGetProfile, khuongfbGetProducts } from "@/lib/khuongfb/client";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const results: Record<string, unknown> = {};

  // Test 1: Profile + số dư
  try {
    results["profile"] = await khuongfbGetProfile();
  } catch (err) {
    results["profile_error"] = err instanceof Error ? err.message : String(err);
  }

  // Test 2: Raw response từ products endpoint (để debug format)
  try {
    const apiKey = process.env.KHUONGFB_API_KEY;
    const url = new URL(KHUONGFB_BASE_URL + KHUONGFB_ENDPOINTS.products);
    url.searchParams.set("api_key", apiKey ?? "");
    const controller = new AbortController();
    setTimeout(() => controller.abort(), KHUONGFB_TIMEOUT_MS);
    const res = await fetch(url.toString(), { signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    results["products_raw_status"] = res.status;
    try {
      results["products_raw"] = JSON.parse(text);
    } catch {
      results["products_raw_text"] = text.slice(0, 500);
    }
  } catch (err) {
    results["products_raw_error"] = err instanceof Error ? err.message : String(err);
  }

  // Test 3: Parsed products
  try {
    const products = await khuongfbGetProducts();
    results["products_total"] = products.length;
    results["products_sample"] = products.slice(0, 3);
    results["products_fields"] = products[0] ? Object.keys(products[0]) : [];
  } catch (err) {
    results["products_error"] = err instanceof Error ? err.message : String(err);
  }

  // Test 4: Chi tiết 1 sản phẩm cụ thể (product_id=9077)
  try {
    const apiKey = process.env.KHUONGFB_API_KEY;
    const url = new URL(KHUONGFB_BASE_URL + KHUONGFB_ENDPOINTS.product);
    url.searchParams.set("api_key", apiKey ?? "");
    url.searchParams.set("product_id", "9077");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    results["product_detail_status"] = res.status;
    try { results["product_detail"] = JSON.parse(text); }
    catch { results["product_detail_raw"] = text.slice(0, 300); }
  } catch (err) {
    results["product_detail_error"] = err instanceof Error ? err.message : String(err);
  }

  // Test 5: Chi tiết đơn hàng (dùng order ID giả để xem format lỗi / format response)
  try {
    const apiKey = process.env.KHUONGFB_API_KEY;
    const url = new URL(KHUONGFB_BASE_URL + KHUONGFB_ENDPOINTS.order);
    url.searchParams.set("api_key", apiKey ?? "");
    url.searchParams.set("order", "TEST_ORDER_ID");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    results["order_detail_status"] = res.status;
    try { results["order_detail"] = JSON.parse(text); }
    catch { results["order_detail_raw"] = text.slice(0, 300); }
  } catch (err) {
    results["order_detail_error"] = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results, { status: 200 });
}
