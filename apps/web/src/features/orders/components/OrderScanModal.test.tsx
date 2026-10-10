import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const interpret = vi.hoisted(() => vi.fn());
vi.mock('../lib/scanApi', () => ({ interpretOrderPhoto: interpret }));

import { createBlankScanDraft } from '../schemas/scanDraft';
import { OrderScanModal } from './OrderScanModal';

beforeEach(() => {
  interpret.mockReset();
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn().mockReturnValue('blob:foto'),
      revokeObjectURL: vi.fn(),
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function selectPhoto(container: HTMLElement) {
  const photo = new File(['test-photo'], 'foto.jpg', { type: 'image/jpeg' });
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [photo] } });
  return photo;
}

describe('digitalização da encomenda', () => {
  it.each([
    { videoWidth: 480, videoHeight: 640, x: 0, y: 140, width: 480, height: 360 },
    { videoWidth: 1280, videoHeight: 720, x: 160, y: 0, width: 960, height: 720 },
  ])('captura o enquadramento horizontal de uma câmara $videoWidth×$videoHeight', async (frame) => {
    const media = { getTracks: () => [{ stop: vi.fn() }] };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(media) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['photo'], { type: 'image/jpeg' }));
    });
    render(<OrderScanModal onClose={vi.fn()} onReview={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir câmara' }));
    const preview = screen.getByLabelText<HTMLVideoElement>('Pré-visualização da câmara');
    await waitFor(() => expect(preview.srcObject).toBe(media));
    Object.defineProperties(preview, {
      videoWidth: { value: frame.videoWidth },
      videoHeight: { value: frame.videoHeight },
    });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tirar foto' })));
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(
      preview,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      0,
      0,
      frame.width,
      frame.height,
    );
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible();
    expect(interpret).not.toHaveBeenCalled();
  });

  it('libera a câmara ao voltar e ignora uma captura que termina depois disso', async () => {
    const stop = vi.fn();
    const media = { getTracks: () => [{ stop }] };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(media) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    let finishCapture!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      finishCapture = callback;
    });
    render(<OrderScanModal onClose={vi.fn()} onReview={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir câmara' }));
    const preview = screen.getByLabelText<HTMLVideoElement>('Pré-visualização da câmara');
    await waitFor(() => expect(preview.srcObject).toBe(media));
    Object.defineProperties(preview, { videoWidth: { value: 640 }, videoHeight: { value: 480 } });
    fireEvent.click(screen.getByRole('button', { name: 'Tirar foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    await act(async () => finishCapture(new Blob(['photo'], { type: 'image/jpeg' })));
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByText('Como deseja adicionar a fotografia?')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(interpret).not.toHaveBeenCalled();
  });

  it('permite refazer sem analisar e mostra só a foto com as duas ações', async () => {
    const user = userEvent.setup();
    const { container } = render(<OrderScanModal onClose={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByText('Como deseja adicionar a fotografia?')).toBeVisible();
    selectPhoto(container);
    expect(screen.getByRole('img')).toBeVisible();
    expect(
      screen.queryByText(/demonstração|simulação|Escolher outra foto/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(screen.getByText('Como deseja adicionar a fotografia?')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(interpret).not.toHaveBeenCalled();
  });

  it('analisa uma vez após continuar, mostra progresso e só entrega o rascunho ao revisar', async () => {
    const user = userEvent.setup();
    const draft = createBlankScanDraft();
    let complete!: (value: typeof draft) => void;
    interpret.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const onReview = vi.fn();
    const { container } = render(<OrderScanModal onClose={vi.fn()} onReview={onReview} />);
    const photo = selectPhoto(container);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(interpret).toHaveBeenCalledExactlyOnceWith(photo);
    expect(screen.getByRole('progressbar')).toBeVisible();
    expect(onReview).not.toHaveBeenCalled();
    await act(async () => complete(draft));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Leitura concluída' })).toBeVisible(),
    );
    await user.click(screen.getByRole('button', { name: 'Revisar encomenda' }));
    expect(onReview).toHaveBeenCalledExactlyOnceWith(draft);
  });

  it('preserva a foto e as opções de refazer ou tentar novamente após uma falha', async () => {
    interpret.mockRejectedValue(new Error('Limite de leitura atingido.'));
    const user = userEvent.setup();
    const { container } = render(<OrderScanModal onClose={vi.fn()} onReview={vi.fn()} />);
    selectPhoto(container);
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Limite de leitura atingido.')).toBeVisible();
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refazer' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });
});
