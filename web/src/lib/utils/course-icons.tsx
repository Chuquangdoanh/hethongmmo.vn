import {
  GraduationCap, BookOpen, MessageCircle, Trophy, RefreshCw,
  Users, Target, Smartphone, Zap, Shield, Lightbulb, Phone,
  Headphones, Star, CheckCircle, Clock, Award, FileText, Video,
  LifeBuoy, Heart, Wifi, Download, BadgeCheck, type LucideIcon,
} from "lucide-react";

export interface CourseIconDef {
  name: string;
  label: string;
  Icon: LucideIcon;
}

export const COURSE_SUPPORT_ICONS: CourseIconDef[] = [
  { name: "GraduationCap",  label: "Chứng chỉ",   Icon: GraduationCap },
  { name: "BookOpen",       label: "Tài liệu",     Icon: BookOpen },
  { name: "MessageCircle",  label: "Chat hỗ trợ",  Icon: MessageCircle },
  { name: "Headphones",     label: "Hỗ trợ 1:1",   Icon: Headphones },
  { name: "Users",          label: "Cộng đồng",    Icon: Users },
  { name: "Shield",         label: "Bảo hành",     Icon: Shield },
  { name: "BadgeCheck",     label: "Xác nhận",     Icon: BadgeCheck },
  { name: "CheckCircle",    label: "Cam kết",       Icon: CheckCircle },
  { name: "Award",          label: "Giải thưởng",  Icon: Award },
  { name: "Trophy",         label: "Thành tích",   Icon: Trophy },
  { name: "Star",           label: "Chất lượng",   Icon: Star },
  { name: "Target",         label: "Mục tiêu",     Icon: Target },
  { name: "Lightbulb",      label: "Kiến thức",    Icon: Lightbulb },
  { name: "RefreshCw",      label: "Cập nhật",     Icon: RefreshCw },
  { name: "Download",       label: "Tải xuống",    Icon: Download },
  { name: "FileText",       label: "PDF/Docs",     Icon: FileText },
  { name: "Video",          label: "Video",        Icon: Video },
  { name: "Smartphone",     label: "Mobile",       Icon: Smartphone },
  { name: "Wifi",           label: "Online",       Icon: Wifi },
  { name: "Zap",            label: "Nhanh chóng",  Icon: Zap },
  { name: "Clock",          label: "Linh hoạt",    Icon: Clock },
  { name: "Phone",          label: "Hotline",      Icon: Phone },
  { name: "LifeBuoy",       label: "Cứu trợ",      Icon: LifeBuoy },
  { name: "Heart",          label: "Tận tâm",      Icon: Heart },
];

const ICON_MAP = new Map<string, LucideIcon>(
  COURSE_SUPPORT_ICONS.map(({ name, Icon }) => [name, Icon]),
);

interface CourseIconProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Render lucide icon theo tên. Fallback về text nếu không tìm thấy (tương thích emoji cũ). */
export function CourseIcon({ name, size = 16, className, strokeWidth = 1.75 }: CourseIconProps) {
  const Icon = ICON_MAP.get(name);
  if (!Icon) return <span className={className}>{name}</span>;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}
