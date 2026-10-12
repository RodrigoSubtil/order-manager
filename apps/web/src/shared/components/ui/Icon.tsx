import type { SVGAttributes } from 'react';

import styles from './Icon.module.css';

export type IconName =
  | 'layers'
  | 'calendar'
  | 'check'
  | 'trash'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'chevron-down'
  | 'clock'
  | 'eye'
  | 'eye-off'
  | 'phone'
  | 'plus'
  | 'search'
  | 'user';

type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'> & {
  name: IconName;
  placement?: 'field';
};

function IconContent({ name }: { name: IconName }) {
  switch (name) {
    case 'layers':
      return (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
        </>
      );
    case 'calendar':
      return (
        <>
          <path d="M7 3v3M17 3v3M4 9h16" />
          <rect x="4" y="5" width="16" height="16" rx="2" />
        </>
      );
    case 'check':
      return <path d="m5 12 4 4L19 6" />;
    case 'trash':
      return <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6" />;
    case 'chevron-left':
      return <path d="m14.5 5-7 7 7 7" />;
    case 'chevron-right':
      return <path d="m9.5 5 7 7-7 7" />;
    case 'close':
      return <path d="m6 6 12 12M18 6 6 18" />;
    case 'chevron-down':
      return <path d="m7 9.5 5 5 5-5" />;
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      );
    case 'eye-off':
      return (
        <>
          <path d="m3 3 18 18M10.7 10.7a2 2 0 0 0 2.6 2.6M9.8 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a15 15 0 0 1-2.4 3.2M6.2 6.2A16 16 0 0 0 2.5 12S6 19 12 19c1.1 0 2.2-.2 3.1-.6" />
        </>
      );
    case 'phone':
      return (
        <path d="M7.2 3.5 9.5 8 7.8 9.8a14 14 0 0 0 6.4 6.4l1.8-1.7 4.5 2.3-.6 3.1a2 2 0 0 1-2.1 1.6C9.6 20.7 3.3 14.4 2.5 6.2a2 2 0 0 1 1.6-2.1Z" />
      );
    case 'plus':
      return <path d="M12 5v14M5 12h14" />;
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16.2 16.2 4.3 4.3" />
        </>
      );
    case 'user':
      return (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </>
      );
  }
}

export function Icon({ className, name, placement, ...props }: IconProps) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      className={[styles.icon, placement === 'field' && styles.field, className]
        .filter(Boolean)
        .join(' ')}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <IconContent name={name} />
    </svg>
  );
}
