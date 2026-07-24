import { Fragment } from 'react';

import styles from './SearchHighlight.module.css';

type SearchHighlightProps = {
  query: string;
  text: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function SearchHighlight({ query, text }: SearchHighlightProps) {
  const terms = Array.from(
    new Set(
      query
        .trim()
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  );
  if (!terms.length) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  return text.split(pattern).map((part, index) =>
    terms.some((term) => part.localeCompare(term, undefined, { sensitivity: 'accent' }) === 0) ? (
      <mark className={styles.mark} key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}
