import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
vi.mock('../../../shared/lib/supabase', () => ({
  supabase: { functions: { invoke } },
}));

import { createBlankScanDraft } from '../schemas/scanDraft';

beforeEach(() => {
  vi.resetModules();
  invoke.mockReset();
  vi.stubEnv('VITE_ORDER_SCAN_ENABLED', 'true');
});
afterEach(() => vi.unstubAllEnvs());

describe('API de digitalização', () => {
  it('usa a função real também em dev, mesmo com a antiga opção de demonstração', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_ORDER_SCAN_DEMO', 'true');
    const draft = createBlankScanDraft();
    invoke.mockResolvedValue({ data: draft, error: null });
    const { interpretOrderPhoto } = await import('./scanApi');
    const photo = new File(['foto'], 'encomenda.jpg', { type: 'image/jpeg' });
    expect(await interpretOrderPhoto(photo)).toEqual(draft);
    expect(invoke).toHaveBeenCalledOnce();
    const [name, { body }] = invoke.mock.calls[0];
    expect(name).toBe('interpret-order');
    expect(body.getAll('photo')).toHaveLength(1);
    expect(body.get('photo')).toMatchObject({
      name: photo.name,
      type: photo.type,
      size: photo.size,
    });
  });

  it('não chama serviços sem fotografia ou com a funcionalidade desligada', async () => {
    const { interpretOrderPhoto } = await import('./scanApi');
    await expect(interpretOrderPhoto()).rejects.toThrow('Selecione uma fotografia');
    vi.stubEnv('VITE_ORDER_SCAN_ENABLED', 'false');
    vi.resetModules();
    const disabled = await import('./scanApi');
    await expect(disabled.interpretOrderPhoto(new File([], 'foto.jpg'))).rejects.toThrow(
      'não está ativada',
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('preserva o aviso de limite e não repete automaticamente a chamada', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { context: Response.json({ error: 'Orçamento mensal atingido.' }, { status: 429 }) },
    });
    const { interpretOrderPhoto } = await import('./scanApi');
    await expect(interpretOrderPhoto(new File([], 'foto.jpg'))).rejects.toThrow(
      'Orçamento mensal atingido.',
    );
    expect(invoke).toHaveBeenCalledOnce();
  });
});
