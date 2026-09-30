import { afterEach, describe, expect, it, vi } from 'vitest';

import { preparePrintFrame } from './preparePrintFrame';

afterEach(() => {
  document.querySelectorAll('[data-print-frame]').forEach((frame) => frame.remove());
  vi.restoreAllMocks();
});

describe('preparePrintFrame', () => {
  it('isola o talão do painel e mede a página no documento de impressão', async () => {
    const inserted: string[] = [];
    const originalInsertRule = CSSStyleSheet.prototype.insertRule;
    vi.spyOn(CSSStyleSheet.prototype, 'insertRule').mockImplementation(function (
      this: CSSStyleSheet,
      rule,
      index,
    ) {
      inserted.push(rule);
      return originalInsertRule.call(this, rule, index);
    });
    const stylesheet = document.createElement('style');
    stylesheet.textContent = ':root {}';
    document.head.appendChild(stylesheet);
    const source = document.createElement('section');
    source.dataset.printRoot = '';
    const card = document.createElement('article');
    card.dataset.printCard = '';
    card.textContent = 'Pedido #1';
    source.appendChild(card);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 180,
    } as DOMRect);

    try {
      const frame = await preparePrintFrame(source);
      const printDocument = frame.contentDocument!;
      expect(printDocument.querySelector('#root')).toBeNull();
      expect(printDocument.querySelector('[data-print-card]')?.textContent).toBe('Pedido #1');
      expect(inserted).toContain('@page order_receipt_1 { size: 80mm 51mm; margin: 0; }');
      expect(
        Array.from(printDocument.styleSheets).some((sheet) =>
          Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('order_receipt_1')),
        ),
      ).toBe(true);
      expect(source.parentElement).toBeNull();
    } finally {
      stylesheet.remove();
    }
  });
});
