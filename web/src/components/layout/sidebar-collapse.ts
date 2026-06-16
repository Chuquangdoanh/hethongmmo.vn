const STORAGE_KEY = "sb-collapsed";
const CLASS_NAME = "sb-collapsed";

export function toggleSidebarCollapse(): void {
  const next = !document.documentElement.classList.contains(CLASS_NAME);
  document.documentElement.classList.toggle(CLASS_NAME, next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // localStorage có thể bị chặn (private mode) — bỏ qua, chỉ mất persistence
  }
}

export function applyStoredSidebarCollapse(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      document.documentElement.classList.add(CLASS_NAME);
    }
  } catch {
    // ignore
  }
}
