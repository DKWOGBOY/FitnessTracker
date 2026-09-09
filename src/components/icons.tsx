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

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function IconWaterGlass({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M6.5 4.5h11l-1.4 14.3a1 1 0 0 1-1 .9H8.9a1 1 0 0 1-1-.9L6.5 4.5Z" />
      <path d="M7.3 12.6c1.8-1.5 3.6-1.5 5.4 0s3.6 1.5 5.2 0" />
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

export function IconTarget({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconRuler({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8v3M11 8v3M15 8v3M19 8v3" />
    </svg>
  );
}

export function IconLink({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M9.5 14.5l5-5" />
      <path d="M8 16.5a3.5 3.5 0 0 1 0-5l2-2" />
      <path d="M16 7.5a3.5 3.5 0 0 1 0 5l-2 2" />
    </svg>
  );
}

export function IconDownload({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M12 4v11" />
      <path d="M7.5 11l4.5 4.5L16.5 11" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 19c1-3.5 4-5 7-5s6 1.5 7 5" />
    </svg>
  );
}

export function IconBarcode({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M4 5v14M8 5v14M11 5v14M13 5v14M16 5v14M20 5v14" />
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
