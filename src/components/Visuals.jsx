const paths = {
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  back: <path d="m15 5-7 7 7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  home: (
    <>
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 21v-8h6v8" />
    </>
  ),
  gym: (
    <>
      <path d="m6 5 13 13M3 8l5-5M2 5l3-3M16 21l5-5M19 22l3-3M5 10l5-5M14 19l5-5" />
    </>
  ),
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7z" />,
  time: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  journal: (
    <>
      <rect x="5" y="3" width="15" height="18" rx="3" />
      <path d="M8 3v18M12 8h4M12 12h4" />
    </>
  ),
  play: <path d="m9 5 11 7-11 7z" />,
  pause: (
    <>
      <path d="M9 5v14M15 5v14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M5 12h14M12 5v14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </>
  ),
};

export function Icon({ name, size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

