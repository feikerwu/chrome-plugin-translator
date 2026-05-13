const TOAST_ID = "chrome-plugin-toast";

interface ToastOptions {
  type?: "success" | "error" | "info";
  duration?: number;
}

const COLORS = {
  success: { bg: "#1a1a2e", color: "#e0e0e0" },
  error: { bg: "#8b0000", color: "#fff" },
  info: { bg: "#4a90d9", color: "#fff" },
};

export function showToast(html: string, options: ToastOptions = {}) {
  const { type = "success", duration = 3000 } = options;
  const existing = document.getElementById(TOAST_ID);
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.innerHTML = html;
  const colors = COLORS[type];
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: colors.bg,
    color: colors.color,
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    zIndex: "2147483647",
    fontSize: "13px",
    lineHeight: "1.5",
    fontFamily: "system-ui, sans-serif",
    transition: "opacity 0.3s",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
