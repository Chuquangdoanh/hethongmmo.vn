import { Resend } from "resend";
import { logger } from "@/lib/utils/logger";
import { formatVnd, formatDate } from "@/lib/utils/format";

const FROM = process.env.EMAIL_FROM ?? "noreply@hethongmmo.vn";
const APP_URL = process.env.APP_URL ?? "https://hethongmmo.vn";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Escapes user-supplied strings before inserting into HTML email body */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Wraps content in the brand email shell (dark theme, design system colors) */
function baseTemplate(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>hethongmmo.vn</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:'Helvetica Neue',Arial,sans-serif;color:#F4F4F5;">
  <span style="display:none;max-height:0;overflow:hidden;color:#0A0A0F;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#14141F;border-radius:12px;overflow:hidden;border:1px solid #2A2A38;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px;border-bottom:1px solid #2A2A38;">
            <h1 style="margin:0;font-size:22px;font-weight:700;background:linear-gradient(90deg,#A855F7,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
              hethongmmo.vn
            </h1>
            <p style="margin:4px 0 0;font-size:12px;color:#71717A;">Nền tảng dịch vụ MMO uy tín</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">${content}</td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #2A2A38;background:#0F0F1A;">
            <p style="margin:0;font-size:12px;color:#71717A;line-height:1.7;">
              Email này được gửi tự động, vui lòng không trả lời.<br>
              Cần hỗ trợ? Liên hệ <a href="${APP_URL}/lien-he" style="color:#A855F7;text-decoration:none;">${APP_URL}/lien-he</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#52525B;">© 2026 hethongmmo.vn. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Core send wrapper — never throws, always returns EmailResult */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ to, subject }, "[DEV] Email not sent — set RESEND_API_KEY in .env");
    return { success: true, messageId: "dev-mode" };
  }
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html, text });
    if (error) {
      logger.error({ to, subject, error: error.message }, "Email failed");
      return { success: false, error: error.message };
    }
    logger.info({ to, subject, messageId: data?.id }, "Email sent");
    return { success: true, messageId: data?.id };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    logger.error({ to, subject, error: msg }, "Email exception");
    return { success: false, error: msg };
  }
}

// ── 1. OTP Email ──────────────────────────────────────────────────────────────

const OTP_PURPOSE_TEXT: Record<string, string> = {
  REGISTER:           "việc đăng ký tài khoản",
  RESET_PASSWORD:     "việc đặt lại mật khẩu",
  EMAIL_VERIFY:       "việc xác minh email",
  WITHDRAWAL_CONFIRM: "lệnh rút tiền của bạn",
  SENSITIVE_ACTION:   "thao tác quan trọng",
  LOGIN_2FA:          "việc đăng nhập",
};

/**
 * Gửi mã OTP qua email. Không log code, không log purpose chi tiết.
 * Caller chịu trách nhiệm generate code từ otp.service.ts.
 */
export async function sendOtpEmail({
  to,
  code,
  purpose,
  expiresInMin = 10,
}: {
  to: string;
  code: string;
  purpose: string;
  expiresInMin?: number;
}): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ to, purpose, otpCode: code }, "[DEV] OTP not sent — set RESEND_API_KEY in .env to send real emails");
    return { success: true, messageId: "dev-mode" };
  }
  const purposeText = OTP_PURPOSE_TEXT[purpose] ?? "thao tác này";
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#F4F4F5;font-weight:600;">Mã xác minh của bạn</h2>
    <p style="color:#A1A1AA;font-size:14px;line-height:1.7;margin:0 0 32px;">
      Sử dụng mã OTP bên dưới để hoàn tất ${purposeText}. Mã có hiệu lực trong <strong style="color:#F4F4F5;">${expiresInMin} phút</strong>.
    </p>
    <div style="margin:0 0 32px;text-align:center;">
      <div style="display:inline-block;padding:20px 48px;background:#1F1F2E;border-radius:12px;border:2px solid #7C3AED;">
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#A855F7;font-family:'Courier New',monospace;">${escapeHtml(code)}</div>
      </div>
    </div>
    <p style="color:#71717A;font-size:13px;margin:0;line-height:1.7;">
      ⚠️ <strong style="color:#F59E0B;">KHÔNG</strong> chia sẻ mã này với bất kỳ ai, kể cả nhân viên hethongmmo.vn.
    </p>`;

  return sendEmail(
    to,
    "Mã xác minh OTP - hethongmmo.vn",
    baseTemplate(content, `Mã OTP xác minh ${purposeText} — có hiệu lực ${expiresInMin} phút`),
    `Mã OTP của bạn: ${code} (hiệu lực ${expiresInMin} phút). Không chia sẻ mã này với ai.`,
  );
}

// ── 2. Deposit Email ──────────────────────────────────────────────────────────

/**
 * Thông báo nạp tiền thành công.
 */
export async function sendDepositEmail({
  to,
  amount,
  newBalance,
  referenceCode,
}: {
  to: string;
  amount: number | string;
  newBalance: number | string;
  referenceCode: string;
}): Promise<EmailResult> {
  const now = new Date();
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#10B981;font-weight:600;">✅ Nạp tiền thành công</h2>
    <p style="color:#A1A1AA;font-size:14px;margin:0 0 24px;">Tài khoản của bạn vừa được cộng:</p>
    <div style="font-size:36px;font-weight:700;color:#10B981;margin:0 0 24px;">
      + ${formatVnd(amount)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#1F1F2E;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #2A2A38;">Mã giao dịch</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-family:monospace;border-bottom:1px solid #2A2A38;">${escapeHtml(referenceCode)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #2A2A38;">Số dư mới</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid #2A2A38;">${formatVnd(newBalance)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;">Thời gian</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;">${formatDate(now)}</td>
      </tr>
    </table>
    <a href="${APP_URL}/lich-su-giao-dich"
       style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Xem lịch sử giao dịch →
    </a>`;

  return sendEmail(
    to,
    `Nạp tiền thành công - ${formatVnd(amount)}`,
    baseTemplate(content, `Tài khoản của bạn vừa được cộng ${formatVnd(amount)}`),
  );
}

// ── 3. Order Email ────────────────────────────────────────────────────────────

/**
 * Xác nhận đơn hàng. Nếu có deliveredContent (MMO/Seller) → hiển thị trong block cảnh báo.
 */
export async function sendOrderEmail({
  to,
  orderCode,
  itemName,
  finalPrice,
  deliveredContent,
}: {
  to: string;
  orderCode: string;
  itemName: string;
  finalPrice: number | string;
  deliveredContent?: string;
}): Promise<EmailResult> {
  const contentBlock = deliveredContent
    ? `<div style="margin:24px 0 0;">
        <p style="color:#F59E0B;font-size:13px;margin:0 0 8px;font-weight:600;">
          ⚠️ Vui lòng lưu lại nội dung dưới đây ngay. Mỗi đơn chỉ giao 1 lần.
        </p>
        <div style="background:#1F1F2E;border:1px solid #2A2A38;border-radius:8px;padding:16px;font-family:'Courier New',monospace;font-size:13px;word-break:break-all;color:#A855F7;line-height:1.7;">
          ${escapeHtml(deliveredContent)}
        </div>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 20px;font-size:20px;color:#F4F4F5;font-weight:600;">📦 Xác nhận đơn hàng</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#1F1F2E;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #2A2A38;">Mã đơn</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-family:monospace;font-weight:600;border-bottom:1px solid #2A2A38;">${escapeHtml(orderCode)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #2A2A38;">Sản phẩm</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;border-bottom:1px solid #2A2A38;">${escapeHtml(itemName)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;">Số tiền</td>
        <td style="padding:14px 20px;text-align:right;font-size:14px;font-weight:600;color:#EF4444;">-${formatVnd(finalPrice)}</td>
      </tr>
    </table>
    ${contentBlock}
    <p style="margin:24px 0 0;color:#71717A;font-size:12px;line-height:1.7;">
      Lưu thông tin quan trọng này cẩn thận. hethongmmo.vn không chịu trách nhiệm nếu bạn mất nội dung này.
    </p>`;

  return sendEmail(
    to,
    `Đơn hàng ${escapeHtml(orderCode)} - hethongmmo.vn`,
    baseTemplate(content, `Đơn hàng ${orderCode}: ${itemName}`),
  );
}

// ── 4. Seller Approved Email ──────────────────────────────────────────────────

/**
 * Thông báo tài khoản bán hàng được duyệt.
 */
export async function sendSellerApprovedEmail({
  to,
  category,
  maxProducts,
}: {
  to: string;
  category: string;
  maxProducts: number;
}): Promise<EmailResult> {
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#F4F4F5;font-weight:600;">🎉 Chúc mừng! Bạn đã trở thành Seller</h2>
    <p style="color:#A1A1AA;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Tài khoản bán hàng của bạn đã được phê duyệt. Bạn có thể bắt đầu đăng sản phẩm ngay bây giờ.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#1F1F2E;border-radius:8px;overflow:hidden;margin:0 0 28px;">
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;border-bottom:1px solid #2A2A38;">Danh mục</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;border-bottom:1px solid #2A2A38;">${escapeHtml(category)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#A1A1AA;font-size:13px;">Số sản phẩm tối đa</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;">${maxProducts} sản phẩm</td>
      </tr>
    </table>
    <a href="${APP_URL}/ban-hang"
       style="display:inline-block;padding:12px 28px;background:linear-gradient(90deg,#7C3AED,#A855F7);color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Truy cập trang quản lý bán hàng →
    </a>`;

  return sendEmail(
    to,
    "🎉 Đăng ký bán hàng đã được duyệt",
    baseTemplate(content, "Tài khoản bán hàng của bạn đã được phê duyệt!"),
  );
}

// ── 5. Seller Rejected Email ──────────────────────────────────────────────────

/**
 * Thông báo đơn đăng ký bán hàng bị từ chối.
 */
export async function sendSellerRejectedEmail({
  to,
  rejectReason,
}: {
  to: string;
  rejectReason: string;
}): Promise<EmailResult> {
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#EF4444;font-weight:600;">Đơn đăng ký bán hàng bị từ chối</h2>
    <p style="color:#A1A1AA;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Chúng tôi đã xem xét đơn đăng ký bán hàng của bạn và rất tiếc phải thông báo rằng đơn không được chấp thuận lần này.
    </p>
    <div style="padding:16px 20px;background:#1F1F2E;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#71717A;text-transform:uppercase;letter-spacing:0.5px;">Lý do từ chối</p>
      <p style="margin:0;font-size:14px;color:#F4F4F5;line-height:1.7;">${escapeHtml(rejectReason)}</p>
    </div>
    <p style="color:#A1A1AA;font-size:13px;line-height:1.7;margin:0 0 24px;">
      Bạn có thể gửi lại đơn đăng ký sau khi khắc phục các vấn đề được nêu ở trên.
    </p>
    <a href="${APP_URL}/thong-tin-ca-nhan"
       style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Gửi lại đơn đăng ký →
    </a>`;

  return sendEmail(
    to,
    "Đơn đăng ký bán hàng không được chấp thuận",
    baseTemplate(content, "Đơn đăng ký bán hàng của bạn chưa được duyệt"),
  );
}

// ── 6. Withdrawal Email ───────────────────────────────────────────────────────

type WithdrawalStatus = "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";

const WITHDRAWAL_STATUS_CONFIG: Record<WithdrawalStatus, { subject: string; badge: string; color: string }> = {
  PENDING:   { subject: "Yêu cầu rút tiền đã được tiếp nhận", badge: "Đã tiếp nhận",  color: "#F59E0B" },
  APPROVED:  { subject: "Yêu cầu rút tiền đã được duyệt",    badge: "Đã duyệt",       color: "#10B981" },
  COMPLETED: { subject: "Đã chuyển khoản thành công",          badge: "Hoàn thành",     color: "#A855F7" },
  REJECTED:  { subject: "Yêu cầu rút tiền bị từ chối",         badge: "Bị từ chối",     color: "#EF4444" },
};

/**
 * Thông báo trạng thái rút tiền.
 */
export async function sendWithdrawalEmail({
  to,
  netAmount,
  status,
  rejectReason,
}: {
  to: string;
  netAmount: number | string;
  status: WithdrawalStatus;
  rejectReason?: string;
}): Promise<EmailResult> {
  const cfg = WITHDRAWAL_STATUS_CONFIG[status];
  const rejectBlock = rejectReason && status === "REJECTED"
    ? `<div style="margin:16px 0 0;padding:14px 20px;background:#1F1F2E;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#A1A1AA;">Lý do từ chối:</p>
        <p style="margin:4px 0 0;font-size:14px;color:#EF4444;">${escapeHtml(rejectReason)}</p>
       </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#F4F4F5;">${cfg.subject}</h2>
    <div style="display:inline-block;padding:6px 16px;background:#1F1F2E;border-radius:20px;border:1px solid ${cfg.color};margin:0 0 24px;">
      <span style="font-size:13px;color:${cfg.color};font-weight:600;">${cfg.badge}</span>
    </div>
    <p style="color:#A1A1AA;font-size:14px;margin:0 0 20px;">
      Số tiền thực nhận: <strong style="color:#F4F4F5;font-size:18px;">${formatVnd(netAmount)}</strong>
    </p>
    ${rejectBlock}
    <a href="${APP_URL}/ban-hang/rut-tien"
       style="display:inline-block;margin-top:24px;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Xem lịch sử rút tiền →
    </a>`;

  return sendEmail(
    to,
    cfg.subject,
    baseTemplate(content, cfg.subject),
  );
}

// ── 7. Password Reset Email ───────────────────────────────────────────────────

/**
 * Gửi link đặt lại mật khẩu. Token KHÔNG được log.
 */
export async function sendPasswordResetEmail({
  to,
  resetToken,
}: {
  to: string;
  resetToken: string;
}): Promise<EmailResult> {
  const resetUrl = `${APP_URL}/dat-lai-mat-khau?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}`;

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#F4F4F5;">Đặt lại mật khẩu</h2>
    <p style="color:#A1A1AA;font-size:14px;line-height:1.7;margin:0 0 28px;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này.<br>
      Nhấn vào nút bên dưới để đặt lại mật khẩu. Link có hiệu lực <strong style="color:#F4F4F5;">30 phút</strong>.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;padding:14px 32px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.3px;">
      Đặt lại mật khẩu
    </a>
    <p style="margin:28px 0 0;color:#71717A;font-size:13px;line-height:1.7;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.<br>
      Mật khẩu của bạn vẫn an toàn và không có thay đổi nào được thực hiện.
    </p>`;

  return sendEmail(
    to,
    "Đặt lại mật khẩu - hethongmmo.vn",
    baseTemplate(content, "Yêu cầu đặt lại mật khẩu tài khoản hethongmmo.vn"),
    `Đặt lại mật khẩu: ${resetUrl} (hiệu lực 30 phút)`,
  );
}
