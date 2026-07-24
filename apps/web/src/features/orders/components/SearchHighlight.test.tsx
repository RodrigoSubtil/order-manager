import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SearchHighlight } from './SearchHighlight';

describe('SearchHighlight', () => {
  it('highlights every typed search term without changing the text', () => {
    render(<SearchHighlight query="bolo chocolate" text="Bolo de Chocolate" />);

    expect(screen.getByText('Bolo').tagName).toBe('MARK');
    expect(screen.getByText('Chocolate').tagName).toBe('MARK');
    expect(screen.getByText('de')).not.toHaveAttribute('class');
  });

  it('renders plain text when the search is empty', () => {
    const { container } = render(<SearchHighlight query=" " text="Ana Silva" />);

    expect(container).toHaveTextContent('Ana Silva');
    expect(container.querySelector('mark')).toBeNull();
  });
});
