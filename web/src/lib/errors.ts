export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(current?: number, required?: number) {
    super(
      `Số dư không đủ${current !== undefined && required !== undefined ? `. Cần ${required}, hiện có ${current}` : ""}`,
      "INSUFFICIENT_BALANCE",
      402,
    );
    this.name = "InsufficientBalanceError";
  }
}

export class DuplicateError extends AppError {
  constructor(field: string, value?: string) {
    super(
      `${field}${value ? ` "${value}"` : ""} đã tồn tại`,
      "DUPLICATE_ENTRY",
      409,
    );
    this.name = "DuplicateError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} không tồn tại`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class OutOfStockError extends AppError {
  constructor() {
    super("Sản phẩm tạm hết hàng", "OUT_OF_STOCK", 409);
    this.name = "OutOfStockError";
  }
}

export class ItemInactiveError extends AppError {
  constructor() {
    super("Sản phẩm hiện không khả dụng", "ITEM_INACTIVE", 400);
    this.name = "ItemInactiveError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

/** Converts an AppError to a standard API response shape. */
export function toApiError(err: unknown): {
  error: string;
  code: string;
  statusCode: number;
} {
  if (err instanceof AppError) {
    return { error: err.message, code: err.code, statusCode: err.statusCode };
  }
  return {
    error: "Lỗi hệ thống. Vui lòng thử lại.",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}
