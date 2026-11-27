/** Inline SVG icons (no icon dependency). */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  width: 20,
  height: 20,
  'aria-hidden': 'true',
};

export const IconCart = (props) => (
  <svg {...base} {...props}>
    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.5L21 8H6" />
    <circle cx="10" cy="20" r="1.3" />
    <circle cx="18" cy="20" r="1.3" />
  </svg>
);

export const IconSearch = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const IconUser = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const IconMenu = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconPlus = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = (props) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const IconTrash = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const IconCheck = (props) => (
  <svg {...base} {...props}>
    <path d="m4 12 5 5L20 6" />
  </svg>
);

export const IconStar = (props) => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M12 3.6l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z" />
  </svg>
);

export const IconTruck = (props) => (
  <svg {...base} {...props}>
    <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17.5" cy="18" r="1.6" />
  </svg>
);

export const IconShield = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3l7 3v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconBox = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3 4 7v10l8 4 8-4V7z" />
    <path d="M4 7l8 4 8-4M12 11v10" />
  </svg>
);

export const IconChart = (props) => (
  <svg {...base} {...props}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 17v-5M12.5 17V8M17 17v-3" />
  </svg>
);

export const IconGrid = (props) => (
  <svg {...base} {...props}>
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  </svg>
);

export const IconDashboard = (props) => (
  <svg {...base} {...props}>
    <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
  </svg>
);

export const IconTag = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12.5 12.5 3H21v8.5L11.5 21z" />
    <circle cx="16.5" cy="7.5" r="1.4" />
  </svg>
);

export const IconOrders = (props) => (
  <svg {...base} {...props}>
    <path d="M7 3h10v18l-5-3-5 3z" />
    <path d="M10 8h4M10 12h4" />
  </svg>
);

export const IconUsers = (props) => (
  <svg {...base} {...props}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16 5.2a3.4 3.4 0 0 1 0 6.6M17.5 20a6.2 6.2 0 0 0-1.6-4.2" />
  </svg>
);

export const IconLogout = (props) => (
  <svg {...base} {...props}>
    <path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" />
  </svg>
);

export const IconChevron = (props) => (
  <svg {...base} {...props}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconEdit = (props) => (
  <svg {...base} {...props}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="m14 6 4 4" />
  </svg>
);

export const IconRefresh = (props) => (
  <svg {...base} {...props}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 5v6h-6" />
  </svg>
);
