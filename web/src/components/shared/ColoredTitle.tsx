import type { CSSProperties } from "react";

interface Segment { text: string; colored: boolean }

function parse(raw: string): Segment[] {
  const re = /\["([^"]+)"\]/g;
  const segments: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) segments.push({ text: raw.slice(last, m.index), colored: false });
    segments.push({ text: m[1] ?? "", colored: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) segments.push({ text: raw.slice(last), colored: false });
  return segments;
}

// Render text, preserving \n as <br>
function segContent(text: string) {
  if (!text.includes("\n")) return text;
  const lines = text.split("\n");
  return lines.map((line, i) => (
    <span key={i}>{line}{i < lines.length - 1 && <br />}</span>
  ));
}

interface Props {
  text: string;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Renders a title string where text wrapped in ["..."] is shown in accentColor.
 * Example: 'Dịch vụ ["Facebook & TikTok"] chuyên nghiệp'
 *   → "Dịch vụ " + <span color=accent>"Facebook & TikTok"</span> + " chuyên nghiệp"
 * Works in both Server and Client components.
 */
export function ColoredTitle({ text, accentColor = "#0066ff", className, style }: Props) {
  const segments = parse(text);
  return (
    <span className={className} style={style}>
      {segments.map((seg, i) =>
        seg.colored ? (
          <span key={i} style={{ color: accentColor }}>{segContent(seg.text)}</span>
        ) : (
          <span key={i}>{segContent(seg.text)}</span>
        )
      )}
    </span>
  );
}
