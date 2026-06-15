import { Resend } from "resend";
import { logger } from "@/lib/utils/logger";
import { formatVnd, formatDate } from "@/lib/utils/format";

const FROM = process.env.EMAIL_FROM ?? "noreply@hethongmmo.vn";
// Priority: AUTH_URL > NEXT_PUBLIC_APP_URL > APP_URL (all three are set in .env.example)
const APP_URL = (
  process.env.AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  "https://hethongmmo.vn"
).replace(/\/$/, "");

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

/** Wraps content in the brand email shell (light theme, white background) */
function baseTemplate(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>hethongmmo.vn</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F6;font-family:'Helvetica Neue',Arial,sans-serif;color:#18181B;">
  <span style="display:none;max-height:0;overflow:hidden;color:#F4F4F6;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F6;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E4E4E7;">
        <!-- Header -->
        <tr>
          <td style="padding:28px 40px;border-bottom:1px solid #E4E4E7;">
            <h1 style="margin:0;font-size:20px;font-weight:700;color:#7C3AED;">hethongmmo.vn</h1>
            <p style="margin:4px 0 0;font-size:12px;color:#A1A1AA;">Nền tảng dịch vụ MMO uy tín</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">${content}</td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #E4E4E7;background:#FAFAFA;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.7;">
              Email này được gửi tự động, vui lòng không trả lời.<br>
              Cần hỗ trợ? Liên hệ <a href="${APP_URL}/lien-he" style="color:#7C3AED;text-decoration:none;">${APP_URL}/lien-he</a>
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#A1A1AA;">© 2026 hethongmmo.vn. All rights reserved.</p>
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
    <h2 style="margin:0 0 16px;font-size:20px;color:#18181B;font-weight:700;">Mã xác minh của bạn</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 32px;">
      Sử dụng mã OTP bên dưới để hoàn tất ${purposeText}. Mã có hiệu lực trong <strong style="color:#18181B;">${expiresInMin} phút</strong>.
    </p>
    <div style="margin:0 0 32px;text-align:center;">
      <div style="display:inline-block;padding:20px 48px;background:#F5F3FF;border-radius:12px;border:2px solid #7C3AED;">
        <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#7C3AED;font-family:'Courier New',monospace;">${escapeHtml(code)}</div>
      </div>
    </div>
    <p style="color:#9CA3AF;font-size:13px;margin:0;line-height:1.7;">
      ⚠️ <strong style="color:#D97706;">KHÔNG</strong> chia sẻ mã này với bất kỳ ai, kể cả nhân viên hethongmmo.vn.
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
    <h2 style="margin:0 0 16px;font-size:20px;color:#059669;font-weight:700;">✅ Nạp tiền thành công</h2>
    <p style="color:#71717A;font-size:14px;margin:0 0 16px;">Tài khoản của bạn vừa được cộng:</p>
    <div style="font-size:36px;font-weight:700;color:#059669;margin:0 0 24px;">
      + ${formatVnd(amount)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#F9FAFB;border-radius:8px;overflow:hidden;margin:0 0 24px;border:1px solid #E5E7EB;">
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">Mã giao dịch</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-family:monospace;color:#18181B;border-bottom:1px solid #E5E7EB;">${escapeHtml(referenceCode)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">Số dư mới</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;color:#18181B;border-bottom:1px solid #E5E7EB;">${formatVnd(newBalance)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;">Thời gian</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;color:#18181B;">${formatDate(now)}</td>
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
        <p style="color:#D97706;font-size:13px;margin:0 0 8px;font-weight:600;">
          ⚠️ Vui lòng lưu lại nội dung dưới đây ngay. Mỗi đơn chỉ giao 1 lần.
        </p>
        <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:16px;font-family:'Courier New',monospace;font-size:13px;word-break:break-all;color:#7C3AED;line-height:1.7;">
          ${escapeHtml(deliveredContent)}
        </div>
      </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 20px;font-size:20px;color:#18181B;font-weight:700;">📦 Xác nhận đơn hàng</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#F9FAFB;border-radius:8px;overflow:hidden;margin:0 0 24px;border:1px solid #E5E7EB;">
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">Mã đơn</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-family:monospace;font-weight:600;color:#18181B;border-bottom:1px solid #E5E7EB;">${escapeHtml(orderCode)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">Sản phẩm</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;color:#18181B;border-bottom:1px solid #E5E7EB;">${escapeHtml(itemName)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;">Số tiền</td>
        <td style="padding:14px 20px;text-align:right;font-size:14px;font-weight:600;color:#DC2626;">-${formatVnd(finalPrice)}</td>
      </tr>
    </table>
    ${contentBlock}
    <p style="margin:24px 0 0;color:#9CA3AF;font-size:12px;line-height:1.7;">
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
    <h2 style="margin:0 0 16px;font-size:20px;color:#18181B;font-weight:700;">🎉 Chúc mừng! Bạn đã trở thành Seller</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Tài khoản bán hàng của bạn đã được phê duyệt. Bạn có thể bắt đầu đăng sản phẩm ngay bây giờ.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#F9FAFB;border-radius:8px;overflow:hidden;margin:0 0 28px;border:1px solid #E5E7EB;">
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;border-bottom:1px solid #E5E7EB;">Danh mục</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;color:#18181B;border-bottom:1px solid #E5E7EB;">${escapeHtml(category)}</td>
      </tr>
      <tr>
        <td style="padding:14px 20px;color:#6B7280;font-size:13px;">Số sản phẩm tối đa</td>
        <td style="padding:14px 20px;text-align:right;font-size:13px;font-weight:600;color:#18181B;">${maxProducts} sản phẩm</td>
      </tr>
    </table>
    <a href="${APP_URL}/ban-hang"
       style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
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
    <h2 style="margin:0 0 16px;font-size:20px;color:#DC2626;font-weight:700;">Đơn đăng ký bán hàng bị từ chối</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Chúng tôi đã xem xét đơn đăng ký bán hàng của bạn và rất tiếc phải thông báo rằng đơn không được chấp thuận lần này.
    </p>
    <div style="padding:16px 20px;background:#FEF2F2;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <p style="margin:0 0 4px;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;">Lý do từ chối</p>
      <p style="margin:0;font-size:14px;color:#18181B;line-height:1.7;">${escapeHtml(rejectReason)}</p>
    </div>
    <p style="color:#71717A;font-size:13px;line-height:1.7;margin:0 0 24px;">
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
    ? `<div style="margin:16px 0 0;padding:14px 20px;background:#FEF2F2;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#71717A;">Lý do từ chối:</p>
        <p style="margin:4px 0 0;font-size:14px;color:#DC2626;">${escapeHtml(rejectReason)}</p>
       </div>`
    : "";

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181B;">${cfg.subject}</h2>
    <div style="display:inline-block;padding:6px 16px;background:#F4F4F6;border-radius:20px;border:1px solid ${cfg.color};margin:0 0 24px;">
      <span style="font-size:13px;color:${cfg.color};font-weight:600;">${cfg.badge}</span>
    </div>
    <p style="color:#71717A;font-size:14px;margin:0 0 20px;">
      Số tiền thực nhận: <strong style="color:#18181B;font-size:18px;">${formatVnd(netAmount)}</strong>
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
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181B;">Đặt lại mật khẩu</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 28px;">
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này.<br>
      Nhấn vào nút bên dưới để đặt lại mật khẩu. Link có hiệu lực <strong style="color:#18181B;">30 phút</strong>.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;padding:14px 32px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.3px;">
      Đặt lại mật khẩu
    </a>
    <p style="margin:28px 0 0;color:#9CA3AF;font-size:13px;line-height:1.7;">
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

// ── 8. Complaint Emails ───────────────────────────────────────────────────────

export async function sendComplaintCreatedToUserEmail({
  to,
  subject,
  complaintId,
}: {
  to: string;
  subject: string;
  complaintId: string;
}): Promise<EmailResult> {
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#18181B;font-weight:700;">📋 Khiếu nại đã được tiếp nhận</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Khiếu nại của bạn về <strong style="color:#18181B;">"${escapeHtml(subject)}"</strong> đã được ghi nhận thành công.
    </p>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Admin sẽ xem xét và liên hệ với bạn sớm nhất có thể. Vui lòng theo dõi email để nhận thông báo cập nhật.
    </p>
    <div style="background:#F5F3FF;border-radius:8px;padding:14px 20px;margin:0 0 24px;border:1px solid #DDD6FE;">
      <p style="margin:0;font-size:12px;color:#7C3AED;">Mã khiếu nại: <code style="font-family:monospace;">${escapeHtml(complaintId.slice(0, 8).toUpperCase())}</code></p>
    </div>
    <a href="${APP_URL}/don-hang"
       style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Xem đơn hàng →
    </a>`;

  return sendEmail(
    to,
    `Khiếu nại "${subject.slice(0, 40)}" đã được tiếp nhận`,
    baseTemplate(content, `Khiếu nại của bạn đã được ghi nhận — admin đang xem xét`),
  );
}

export async function sendComplaintCreatedToSellerEmail({
  to,
  subject,
  complaintId,
}: {
  to: string;
  subject: string;
  complaintId: string;
}): Promise<EmailResult> {
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#D97706;font-weight:700;">⚠️ Có khiếu nại mới về đơn hàng của bạn</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Một người mua hàng đã gửi khiếu nại liên quan đến đơn hàng của bạn.
    </p>
    <div style="background:#FFFBEB;border-radius:8px;padding:14px 20px;margin:0 0 24px;border:1px solid #FDE68A;">
      <p style="margin:0 0 6px;font-size:12px;color:#92400E;">Chủ đề khiếu nại</p>
      <p style="margin:0;font-size:14px;color:#18181B;font-weight:600;">${escapeHtml(subject)}</p>
    </div>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Admin đang xem xét. Vui lòng theo dõi email để nhận thông báo về kết quả xử lý.
    </p>
    <a href="${APP_URL}/ban-hang/khieu-nai"
       style="display:inline-block;padding:12px 24px;background:#D97706;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Xem khiếu nại →
    </a>`;

  return sendEmail(
    to,
    `Có khiếu nại mới liên quan đến đơn hàng của bạn`,
    baseTemplate(content, `Người mua vừa gửi khiếu nại về đơn hàng của bạn`),
  );
}

export async function sendComplaintChatOpenedEmail({
  to,
  subject,
}: {
  to: string;
  subject: string;
}): Promise<EmailResult> {
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#2563EB;font-weight:700;">💬 Phòng chat khiếu nại đã được mở</h2>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 16px;">
      Admin đã mở phòng chat để hỗ trợ giải quyết khiếu nại:
    </p>
    <div style="background:#EFF6FF;border-radius:8px;padding:14px 20px;margin:0 0 24px;border:1px solid #BFDBFE;">
      <p style="margin:0;font-size:14px;color:#18181B;font-weight:600;">${escapeHtml(subject)}</p>
    </div>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Vui lòng đăng nhập và tham gia phòng chat để trao đổi trực tiếp với admin và các bên liên quan.
    </p>
    <a href="${APP_URL}/tro-chuyen"
       style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Vào phòng chat →
    </a>`;

  return sendEmail(
    to,
    `Phòng chat khiếu nại đã được mở — "${subject.slice(0, 40)}"`,
    baseTemplate(content, `Admin đã mở phòng chat để xử lý khiếu nại`),
  );
}

export async function sendComplaintResolvedEmail({
  to,
  subject,
  title,
  body,
  isPositive,
}: {
  to: string;
  subject: string;
  title: string;
  body: string;
  isPositive: boolean;
}): Promise<EmailResult> {
  const color  = isPositive ? "#059669" : "#DC2626";
  const bg     = isPositive ? "#F0FDF4" : "#FEF2F2";
  const border = isPositive ? "#A7F3D0" : "#FECACA";
  const icon   = isPositive ? "✅" : "❌";

  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;color:${color};font-weight:700;">${icon} ${escapeHtml(title)}</h2>
    <div style="background:${bg};border-radius:8px;padding:14px 20px;margin:0 0 16px;border:1px solid ${border};">
      <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">Chủ đề khiếu nại</p>
      <p style="margin:0;font-size:14px;color:#18181B;font-weight:600;">${escapeHtml(subject)}</p>
    </div>
    <p style="color:#71717A;font-size:14px;line-height:1.7;margin:0 0 24px;">${escapeHtml(body)}</p>
    <a href="${APP_URL}/don-hang"
       style="display:inline-block;padding:12px 24px;background:#7C3AED;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Xem chi tiết →
    </a>`;

  return sendEmail(
    to,
    `Kết quả khiếu nại — ${title}`,
    baseTemplate(content, title),
  );
}
