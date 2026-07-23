import { createElement, type HTMLAttributes, type ReactNode } from 'react';

import styles from './Card.module.css';

type CardElement = 'article' | 'div' | 'section';

export type CardProps = HTMLAttributes<HTMLElement> & {
  as?: CardElement;
  children: ReactNode;
};

export function Card({ as = 'div', children, className, ...props }: CardProps) {
  return createElement(
    as,
    { ...props, className: [styles.card, className].filter(Boolean).join(' ') },
    children,
  );
}
