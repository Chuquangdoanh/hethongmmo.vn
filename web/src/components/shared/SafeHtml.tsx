"use client";

import DOMPurify from "isomorphic-dompurify";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

const ALLOWED_TAGS = ["p", "br", "strong", "em", "u", "a", "ul", "ol", "li", "h2", "h3", "h4", "blockquote"];
const ALLOWED_ATTR = ["href", "title"];

/**
 * Safely renders rich-text HTML through DOMPurify.
 * Always use this component — never dangerouslySetInnerHTML directly.
 */
export default function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^https?:/i,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
