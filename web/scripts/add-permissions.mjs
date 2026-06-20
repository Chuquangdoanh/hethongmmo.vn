/**
 * Script tự động thêm requirePermission vào admin route handlers.
 * Chạy: node scripts/add-permissions.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// Map route paths → permission codes cần thêm
// format: { method: "GET"|"POST"|"PATCH"|"DELETE"|"ALL", permission: "code" }
const ROUTE_MAP = {
  // ── Finance ──────────────────────────────────────────
  "api/admin/deposit/route.ts":                        [{ method: "GET",    permission: "finance:read" }],
  "api/admin/deposits/manual/route.ts":                [{ method: "POST",   permission: "finance:approve" }],
  "api/admin/deposits/unmatched/[id]/route.ts":        [{ method: "PATCH",  permission: "finance:approve" }],
  "api/admin/withdrawals/route.ts":                    [{ method: "GET",    permission: "finance:read" }],
  "api/admin/withdrawals/[id]/route.ts":               [{ method: "PATCH",  permission: "finance:approve" }],
  "api/admin/balance/deduct/route.ts":                 [{ method: "POST",   permission: "finance:approve" }],
  "api/admin/bank-change-requests/[id]/route.ts":      [{ method: "PATCH",  permission: "finance:approve" }],

  // ── Sellers ───────────────────────────────────────────
  "api/admin/sellers/route.ts":                        [{ method: "GET",    permission: "sellers:read" }],
  "api/admin/sellers/[id]/route.ts":                   [{ method: "GET",    permission: "sellers:read" },
                                                        { method: "PATCH",  permission: "sellers:update" },
                                                        { method: "DELETE", permission: "sellers:delete" }],
  "api/admin/sellers/bulk-lock/route.ts":              [{ method: "POST",   permission: "sellers:update" }],
  "api/admin/sellers/[id]/tier/route.ts":              [{ method: "PATCH",  permission: "sellers:update" }],
  "api/admin/sellers/[id]/sub-categories/route.ts":    [{ method: "GET",    permission: "sellers:read" },
                                                        { method: "POST",   permission: "sellers:update" }],
  "api/admin/sellers/[id]/sub-categories/[subId]/route.ts": [{ method: "DELETE", permission: "sellers:update" }],
  "api/admin/dang-ky-dich-vu/ads/[id]/route.ts":      [{ method: "PATCH",  permission: "sellers:update" }],
  "api/admin/dang-ky-dich-vu/fanpage/[id]/route.ts":  [{ method: "PATCH",  permission: "sellers:update" }],

  // ── Seller Products ───────────────────────────────────
  "api/admin/seller-products/route.ts":                [{ method: "GET",    permission: "seller_products:read" }],
  "api/admin/seller-products/[id]/route.ts":           [{ method: "GET",    permission: "seller_products:read" },
                                                        { method: "PATCH",  permission: "seller_products:update" },
                                                        { method: "DELETE", permission: "seller_products:delete" }],

  // ── Categories ────────────────────────────────────────
  "api/admin/service-categories/route.ts":             [{ method: "GET",    permission: "categories:read" },
                                                        { method: "POST",   permission: "categories:create" }],
  "api/admin/service-categories/[id]/route.ts":        [{ method: "PATCH",  permission: "categories:update" },
                                                        { method: "DELETE", permission: "categories:delete" }],
  "api/admin/course-categories/route.ts":              [{ method: "GET",    permission: "categories:read" },
                                                        { method: "POST",   permission: "categories:create" }],
  "api/admin/course-categories/[id]/route.ts":         [{ method: "PATCH",  permission: "categories:update" },
                                                        { method: "DELETE", permission: "categories:delete" }],
  "api/admin/sub-categories/route.ts":                 [{ method: "GET",    permission: "categories:read" },
                                                        { method: "POST",   permission: "categories:create" }],
  "api/admin/sub-categories/[id]/route.ts":            [{ method: "PATCH",  permission: "categories:update" },
                                                        { method: "DELETE", permission: "categories:delete" }],
  "api/admin/resource-categories/route.ts":            [{ method: "GET",    permission: "categories:read" },
                                                        { method: "POST",   permission: "categories:create" }],
  "api/admin/resource-categories/[id]/route.ts":       [{ method: "PATCH",  permission: "categories:update" },
                                                        { method: "DELETE", permission: "categories:delete" }],
  "api/admin/tut-trick-categories/route.ts":           [{ method: "GET",    permission: "categories:read" },
                                                        { method: "POST",   permission: "categories:create" }],
  "api/admin/tut-trick-categories/[id]/route.ts":      [{ method: "PATCH",  permission: "categories:update" },
                                                        { method: "DELETE", permission: "categories:delete" }],

  // ── Products / Services bulk ──────────────────────────
  "api/admin/services/bulk/route.ts":                  [{ method: "POST",   permission: "products:update" }],
  "api/admin/courses/bulk/route.ts":                   [{ method: "POST",   permission: "products:update" }],
  "api/admin/tut-tricks/bulk/route.ts":                [{ method: "POST",   permission: "products:update" }],
  "api/admin/reviews/[id]/route.ts":                   [{ method: "PATCH",  permission: "products:update" },
                                                        { method: "DELETE", permission: "products:update" }],

  // ── Complaints ────────────────────────────────────────
  "api/admin/complaints/[id]/confirm-chat/route.ts":   [{ method: "POST",   permission: "complaints:reply" }],
  "api/admin/complaints/[id]/confirm-order/route.ts":  [{ method: "POST",   permission: "complaints:close" }],
  "api/admin/complaints/[id]/resolve/route.ts":        [{ method: "POST",   permission: "complaints:close" }],

  // ── Chat ──────────────────────────────────────────────
  "api/admin/chats/route.ts":                          [{ method: "GET",    permission: "chat:read" }],

  // ── Content ───────────────────────────────────────────
  "api/admin/testimonials/route.ts":                   [{ method: "GET",    permission: "content:read" },
                                                        { method: "POST",   permission: "content:create" }],
  "api/admin/testimonials/[id]/route.ts":              [{ method: "PATCH",  permission: "content:update" },
                                                        { method: "DELETE", permission: "content:delete" }],
  "api/admin/tickers/texts/route.ts":                  [{ method: "GET",    permission: "content:read" },
                                                        { method: "POST",   permission: "content:create" }],
  "api/admin/tickers/texts/[id]/route.ts":             [{ method: "PATCH",  permission: "content:update" },
                                                        { method: "DELETE", permission: "content:delete" }],
  "api/admin/badges/route.ts":                         [{ method: "GET",    permission: "content:read" },
                                                        { method: "POST",   permission: "content:create" }],
  "api/admin/site-content/route.ts":                   [{ method: "GET",    permission: "content:read" },
                                                        { method: "PATCH",  permission: "content:update" }],
  "api/admin/public-page-configs/route.ts":            [{ method: "GET",    permission: "content:read" },
                                                        { method: "PATCH",  permission: "content:update" }],

  // ── Courses sub-resources ─────────────────────────────
  "api/admin/courses/[id]/faq-categories/route.ts":    [{ method: "GET",    permission: "products:read" },
                                                        { method: "POST",   permission: "products:update" }],
  "api/admin/courses/[id]/faq-categories/[catId]/route.ts": [{ method: "PATCH",  permission: "products:update" },
                                                              { method: "DELETE", permission: "products:update" }],
  "api/admin/courses/[id]/faqs/route.ts":              [{ method: "GET",    permission: "products:read" },
                                                        { method: "POST",   permission: "products:update" }],
  "api/admin/courses/[id]/faqs/[faqId]/route.ts":      [{ method: "PATCH",  permission: "products:update" },
                                                        { method: "DELETE", permission: "products:update" }],
  "api/admin/courses/[id]/support-items/route.ts":     [{ method: "GET",    permission: "products:read" },
                                                        { method: "POST",   permission: "products:update" }],
  "api/admin/courses/[id]/support-items/[itemId]/route.ts": [{ method: "PATCH",  permission: "products:update" },
                                                              { method: "DELETE", permission: "products:update" }],

  // ── Upload (cần ít nhất 1 trong content/products:create) ──
  "api/admin/upload/thumbnail/route.ts":               [{ method: "POST",   permission: "content:create" }],
  "api/admin/upload/from-url/route.ts":                [{ method: "POST",   permission: "content:create" }],
  "api/admin/secure-image/route.ts":                   [{ method: "GET",    permission: "products:read" }],
};

// ─────────────────────────────────────────────────────────────────────────────

const SRC_DIR = "C:/Hethongmmo/web/src/app";

let updatedCount = 0;
let skippedCount = 0;

for (const [relPath, checks] of Object.entries(ROUTE_MAP)) {
  const fullPath = join(SRC_DIR, relPath);

  let content;
  try {
    content = readFileSync(fullPath, "utf-8");
  } catch {
    console.warn(`⚠️  File not found: ${relPath}`);
    skippedCount++;
    continue;
  }

  // Already has requirePermission? Skip (idempotent)
  if (content.includes("requirePermission")) {
    console.log(`  ✓ skip (already patched): ${relPath}`);
    skippedCount++;
    continue;
  }

  let modified = content;

  // 1. Add requireStaff to import if not already there
  if (!modified.includes("requireStaff")) {
    modified = modified.replace(
      /import \{ requireAdmin \} from "@\/lib\/auth\/rbac";/,
      `import { requireAdmin, requireStaff } from "@/lib/auth/rbac";`,
    );
  }

  // 2. Add requirePermission import after the rbac import
  if (!modified.includes("requirePermission")) {
    modified = modified.replace(
      /import \{ require(?:Admin|Staff)[^}]*\} from "@\/lib\/auth\/rbac";/,
      (m) => `${m}\nimport { requirePermission } from "@/lib/auth/permission-guard";`,
    );
  }

  // 3. For each method → replace requireAdmin with requireStaff + requirePermission
  //    Or add requirePermission after requireStaff
  for (const { method, permission } of checks) {
    if (method === "ALL") {
      // Replace all requireAdmin occurrences
      modified = modified.replaceAll(
        /(\s+)requireAdmin\(session\);/g,
        `$1requireStaff(session);\n$1await requirePermission(session, "${permission}");`,
      );
      break;
    }

    // Find the function declaration for this method
    // Pattern: export async function GET/POST/PATCH/DELETE
    // Then find requireAdmin(session) or requireStaff(session) in that function block
    const funcRegex = new RegExp(
      `(export async function ${method}[\\s\\S]*?)(?=export async function |$)`,
      "g",
    );

    modified = modified.replace(funcRegex, (funcBlock) => {
      // Replace requireAdmin → requireStaff + permission in this block
      if (funcBlock.includes("requireAdmin(session)")) {
        return funcBlock.replace(
          /(\s+)requireAdmin\(session\);/,
          `$1requireStaff(session);\n$1await requirePermission(session, "${permission}");`,
        );
      }
      // Add permission after existing requireStaff
      if (funcBlock.includes("requireStaff(session)") && !funcBlock.includes("requirePermission")) {
        return funcBlock.replace(
          /(\s+)requireStaff\(session\);/,
          `$1requireStaff(session);\n$1await requirePermission(session, "${permission}");`,
        );
      }
      return funcBlock;
    });
  }

  if (modified !== content) {
    writeFileSync(fullPath, modified, "utf-8");
    console.log(`  ✅ updated: ${relPath}`);
    updatedCount++;
  } else {
    console.log(`  ⚠️  no change: ${relPath}`);
    skippedCount++;
  }
}

console.log(`\n📊 Summary: ${updatedCount} updated, ${skippedCount} skipped`);
