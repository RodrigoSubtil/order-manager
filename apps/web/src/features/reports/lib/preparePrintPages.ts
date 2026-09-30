const PAPER_WIDTH_MM = 80;
const CSS_PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;
const END_MARGIN_MM = 3;

function getWritableStyleSheet(printDocument: Document): CSSStyleSheet {
  for (const sheet of Array.from(printDocument.styleSheets).reverse()) {
    try {
      const index = sheet.cssRules.length;
      sheet.insertRule(':root {}', index);
      sheet.deleteRule(index);
      return sheet;
    } catch {
      // Ignore stylesheets from other origins or without CSSOM write access.
    }
  }
  throw new Error('Não foi possível carregar a folha de estilos da impressão.');
}

export function preparePrintPages(root: HTMLElement): CSSStyleSheet {
  const cards = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-print-card]'));
  if (cards.length === 0) {
    throw new Error('Não há encomendas para imprimir.');
  }

  const rules = cards.flatMap((card, index) => {
    const heightPx = card.getBoundingClientRect().height;
    if (!Number.isFinite(heightPx) || heightPx <= 0) {
      throw new Error('Não foi possível medir o talão. Tente imprimir novamente.');
    }

    const heightMm =
      Math.ceil(((heightPx * MM_PER_INCH) / CSS_PX_PER_INCH) * 2) / 2 + END_MARGIN_MM;
    const name = `order_receipt_${index + 1}`;
    return [
      `@page ${name} { size: ${PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; }`,
      `[data-print-root] > [data-print-card]:nth-child(${index + 1}) { page: ${name}; }`,
    ];
  });

  const printDocument = root.ownerDocument;
  const sheet = getWritableStyleSheet(printDocument);
  rules.forEach((rule) => sheet.insertRule(rule, sheet.cssRules.length));
  return sheet;
}
