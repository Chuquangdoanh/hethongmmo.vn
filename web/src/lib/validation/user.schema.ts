import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(/^(0|\+84)[3-9]\d{8}$/, "Số điện thoại không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa (A-Z)")
    .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt (!@#$%...)"),
});

export const loginSchema = z.object({
  email: z.string().min(1).trim().toLowerCase(),
  password: z.string().min(1),
  captchaToken: z.string().optional(),
  postRegisterToken: z.string().optional(),
});

const newPasswordRules = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa (A-Z)")
  .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt (!@#$%...)");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: newPasswordRules,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

// Bước 1: chỉ verify mật khẩu hiện tại → gửi OTP về email
export const sendChangePasswordOtpSchema = z.object({
  currentPassword: z.string().min(1),
});

// Bước 2: đổi mật khẩu kèm mã OTP xác nhận
export const changePasswordWithOtpSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: newPasswordRules,
    confirmPassword: z.string(),
    otpCode: z.string().length(6).regex(/^\d+$/, "Mã OTP gồm 6 chữ số"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^(0|\+84)[3-9]\d{8}$/)
    .optional(),
  bankName: z.string().max(100).trim().optional(),
  bankAccountNumber: z.string().max(30).trim().optional(),
  bankAccountHolder: z.string().max(100).trim().optional(),
  cccdImageUrl: z.string().max(500).optional(),
  portraitImageUrl: z.string().max(500).optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  facebookUrl: z.string().max(500).trim().optional(),
  telegramUsername: z.string().max(100).trim().optional(),
});

export const otpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6).regex(/^\d+$/),
  purpose: z.enum(["REGISTER", "LOGIN_2FA", "RESET_PASSWORD", "EMAIL_VERIFY", "WITHDRAWAL_CONFIRM", "SENSITIVE_ACTION"]),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "Mật khẩu tối thiểu 8 ký tự")
      .regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa (A-Z)")
      .regex(/[^A-Za-z0-9]/, "Cần ít nhất 1 ký tự đặc biệt (!@#$%...)"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
