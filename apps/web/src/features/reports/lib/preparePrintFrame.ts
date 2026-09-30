import { preparePrintPages } from './preparePrintPages';

function copyStyles(target: Document): Promise<void>[] {
  const pending: Promise<void>[] = [];
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    const copy = node.cloneNode(true) as HTMLElement;
    if (copy instanceof HTMLLinkElement) {
      pending.push(
        new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(
            () => reject(new Error('Falha ao carregar o estilo da impressão.')),
            5000,
          );
          copy.onload = () => {
            window.clearTimeout(timer);
            resolve();
          };
          copy.onerror = () => {
            window.clearTimeout(timer);
            reject(new Error('Falha ao carregar o estilo da impressão.'));
          };
        }),
      );
    }
    target.head.appendChild(copy);
  });
  return pending;
}

export async function preparePrintFrame(source: HTMLElement): Promise<HTMLIFrameElement> {
  const frame = document.createElement('iframe');
  frame.dataset.printFrame = 'true';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);

  try {
    const printDocument = frame.contentDocument;
    if (!printDocument) throw new Error('Não foi possível abrir o documento de impressão.');
    printDocument.open();
    printDocument.write('<!doctype html><html lang="pt"><head></head><body></body></html>');
    printDocument.close();
    printDocument.documentElement.dataset.printDocument = 'true';

    const base = printDocument.createElement('base');
    base.href = document.baseURI;
    printDocument.head.appendChild(base);
    const stylesLoaded = copyStyles(printDocument);

    const copy = source.cloneNode(true) as HTMLElement;
    printDocument.body.appendChild(copy);

    await Promise.all(stylesLoaded);
    await printDocument.fonts?.ready;
    preparePrintPages(copy);
    return frame;
  } catch (error) {
    frame.remove();
    throw error;
  }
}
