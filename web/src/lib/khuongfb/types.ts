// Khuongfb API response types — derived from actual API docs
// Thêm field nếu phát hiện thêm sau khi test

export interface KhuongfbProfile {
  status: string;
  balance: number;
  username?: string;
  email?: string;
}

export interface KhuongfbRawProduct {
  id: string | number;
  name: string;
  // API trả price hoặc giá (tiếng Việt)
  price?: string | number;
  giá?: string | number;
  // Số lượng tồn kho: amount hoặc "số tiền"
  amount?: number;
  "số tiền"?: number;
  // Mô tả: description hoặc "mô tả"
  description?: string;
  "mô tả"?: string;
  image?: string;
  flag?: string | null;
  min?: string | number;
  max?: string | number;
  // Inject khi flatten từ categories
  categoryId?: string;
  categoryName?: string;
}

export interface KhuongfbCategory {
  id: string | number;
  parent_id?: string | number;
  name: string;
  icon?: string;
  products?: KhuongfbRawProduct[];
}

export interface KhuongfbProductsResponse {
  status: string;
  msg?: string;
  categories?: KhuongfbCategory[];
  data?: KhuongfbRawProduct[];
  products?: KhuongfbRawProduct[];
  [key: string]: unknown;
}

export interface KhuongfbBuyResponse {
  status: string;
  msg?: string;
  message?: string;
  trans_id?: string;
  order_id?: string;
  data?: unknown;
}

export interface KhuongfbOrderResponse {
  status: string;
  data?: {
    trans_id?: string;
    status?: string;
    remains?: number;
    start_count?: number;
    charge?: string | number;
  };
}

export interface KhuongfbApiError {
  status: "error" | "fail";
  msg?: string;
  message?: string;
  error?: string;
}
