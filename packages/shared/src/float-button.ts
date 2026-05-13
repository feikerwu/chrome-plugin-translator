export interface FloatMenuItem {
  label: string;
  color: string;
  onClick: () => void;
}

export interface FloatButtonOptions {
  id: string;
  label: string;
  menuItems: FloatMenuItem[];
  onMainClick?: () => void;
}

export function createFloatButton(options: FloatButtonOptions): HTMLElement {
  const { id, label, menuItems, onMainClick } = options;

  const existing = document.getElementById(id);
  if (existing) return existing;

  const container = document.createElement("div");
  container.id = id;
  Object.assign(container.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    zIndex: "2147483646",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  });

  let menuVisible = false;
  const menu = document.createElement("div");
  Object.assign(menu.style, {
    display: "none",
    flexDirection: "column",
    gap: "4px",
    alignItems: "flex-end",
  });

  for (const item of menuItems) {
    const btn = document.createElement("button");
    btn.textContent = item.label;
    Object.assign(btn.style, {
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "13px",
      fontFamily: "system-ui, sans-serif",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      padding: "8px 14px",
      backgroundColor: item.color,
      color: "#fff",
      transition: "transform 0.15s",
    });
    btn.addEventListener("click", () => {
      toggleMenu();
      item.onClick();
    });
    menu.appendChild(btn);
  }

  const mainBtn = document.createElement("button");
  mainBtn.setAttribute("data-role", "main");
  mainBtn.textContent = label;
  Object.assign(mainBtn.style, {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#1a1a2e",
    color: "#fff",
    fontSize: "18px",
    padding: "0",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transition: "transform 0.15s",
    fontFamily: "system-ui, sans-serif",
  });

  mainBtn.addEventListener("click", () => {
    if (onMainClick) {
      onMainClick();
    } else {
      toggleMenu();
    }
  });

  function toggleMenu() {
    menuVisible = !menuVisible;
    menu.style.display = menuVisible ? "flex" : "none";
  }

  // drag support
  let startY = 0;
  let startBottom = 0;

  mainBtn.addEventListener("mousedown", (e) => {
    startY = e.clientY;
    startBottom = parseInt(container.style.bottom);

    const onMove = (ev: MouseEvent) => {
      const dy = startY - ev.clientY;
      container.style.bottom = `${startBottom + dy}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  container.appendChild(menu);
  container.appendChild(mainBtn);
  document.body.appendChild(container);

  return container;
}

export function updateFloatButtonLabel(id: string, label: string) {
  const container = document.getElementById(id);
  if (!container) return;
  const mainBtn = container.querySelector("[data-role=main]") as HTMLElement | null;
  if (mainBtn) mainBtn.textContent = label;
}
