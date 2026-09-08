import { useState, type ReactNode } from "react";
import { IconChevronRight } from "../icons";

interface Props {
  icon: ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleRow({ icon, label, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="settings-group-item">
      <button type="button" className="settings-row" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="settings-row-icon">{icon}</span>
        <span className="settings-row-label">{label}</span>
        <IconChevronRight className={`icon settings-row-chevron${open ? " settings-row-chevron-open" : ""}`} />
      </button>
      {open && <div className="settings-row-panel">{children}</div>}
    </div>
  );
}
