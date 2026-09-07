type IconProps = { className?: string };

export function IconLog({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M6 4h9.5L19 7.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 4v3.5H19" />
      <path d="M8 11.5h8M8 15h8" />
    </svg>
  );
}

export function IconTrends({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M5.5 20V12.5M12 20V5.5M18.5 20V15" />
    </svg>
  );
}

export function IconFoods({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12 8.5c-2-2.6-5.5-2-6.5.5-1.3 3.2 1 8.5 4 10 1 .5 1.7.5 2.5.5s1.5 0 2.5-.5c3-1.5 5.3-6.8 4-10-1-2.5-4.5-3.1-6.5-.5Z" />
      <path d="M12 8.5c0-1.8.6-3 2-4" />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconStar({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" style={{ fill: filled ? "currentColor" : "none" }}>
      <path d="M12 4l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 16.4 6.9 19.2l1.2-5.6-4.2-3.8 5.6-.6L12 4Z" />
    </svg>
  );
}

export function IconFlame({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12 3.5c.4 2.3-1 3.4-2.2 4.7C8.5 9.6 7.5 11.1 7.5 13a4.5 4.5 0 0 0 9 0c0-1.3-.5-2.2-1.2-3.1.2 1.3-.2 2.2-1 2.7.3-2.1-.5-3.4-1.7-4.8-.6 1-1.1 1.7-1.1 2.7 0-2.6-.2-4.8.5-7Z" />
    </svg>
  );
}

export function IconBreakfast({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M5 8h11v6.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5V8Z" />
      <path d="M16 9.8h1.7a2.6 2.6 0 0 1 0 5.2H16" />
      <path d="M8.5 4c-.6.9-.9 1.4 0 2.6M12 4c-.6.9-.9 1.4 0 2.6" />
    </svg>
  );
}

export function IconLunch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M4.5 10.8a7.5 7.5 0 0 1 15 0Z" />
      <path d="M3.5 10.8h17" />
      <path d="M4.5 13.6h15" />
      <path d="M5.5 16.4h13" />
    </svg>
  );
}

export function IconDinner({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M4 12h16a8 8 0 0 1-16 0Z" />
      <path d="M12 12V4" />
      <path d="M9.3 6.3c.7.6 1.1 1.2 1.1 2M14.7 6.3c-.7.6-1.1 1.2-1.1 2" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19 19l-4.3-4.3" />
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconArrowLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconSnack({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <circle cx="9.2" cy="9.8" r="0.9" style={{ fill: "currentColor" }} />
      <circle cx="14.6" cy="9.2" r="0.9" style={{ fill: "currentColor" }} />
      <circle cx="10.4" cy="14.6" r="0.9" style={{ fill: "currentColor" }} />
      <circle cx="15" cy="13.8" r="0.9" style={{ fill: "currentColor" }} />
    </svg>
  );
}
