import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { preparePrintPages } from './preparePrintPages';

let stylesheet: HTMLStyleElement;

beforeEach(() => {
  stylesheet = document.createElement('style');
  stylesheet.textContent = ':root {}';
  document.head.appendChild(stylesheet);
});

afterEach(() => {
  stylesheet.remove();
  vi.restoreAllMocks();
});

describe('preparePrintPages', () => {
  it('atribui uma altura própria a cada encomenda e ao resumo', () => {
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
    const root = document.createElement('section');
    const heights = [180, 310, 245];
    heights.forEach((height) => {
      const card = document.createElement('article');
      card.dataset.printCard = '';
      vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
        height,
      } as DOMRect);
      root.appendChild(card);
    });

    preparePrintPages(root);
    const rules = inserted.join('\n');
    expect(rules).toContain('@page order_receipt_1');
    expect(rules).toContain('80mm 51mm');
    expect(rules).toContain('@page order_receipt_2');
    expect(rules).toContain('80mm 85.5mm');
    expect(rules).toContain('@page order_receipt_3');
    expect(rules).toContain('80mm 68mm');
    expect(rules).toContain('nth-child(3)');
  });

  it('não imprime um talão que não foi medido', () => {
    const root = document.createElement('section');
    expect(() => preparePrintPages(root)).toThrow('Não há encomendas');
    const card = document.createElement('article');
    card.dataset.printCard = '';
    root.appendChild(card);
    expect(() => preparePrintPages(root)).toThrow('Não foi possível medir');
  });
});
