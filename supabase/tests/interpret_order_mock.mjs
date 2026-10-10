// Testa a Edge Function sem Supabase remoto, chave real ou chamada paga.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const settings = new Map();
let handler;
globalThis.Deno = {
  env: { get: (name) => settings.get(name) },
  serve: (callback) => {
    handler = callback;
  },
};
await import('../functions/interpret-order/index.ts');

const png = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0,
  0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255, 31, 0, 3, 3, 2, 0, 239,
  191, 149, 119, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

function request() {
  const form = new FormData();
  form.append('photo', new File([png], 'encomenda.png', { type: 'image/png' }));
  return new Request('https://test.supabase.co/functions/v1/interpret-order', {
    method: 'POST',
    body: form,
    headers: { Origin: 'http://localhost:5174', Authorization: 'Bearer user-test' },
  });
}

function configure() {
  settings.clear();
  for (const [key, value] of Object.entries({
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'anon-test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-test',
    OPENAI_API_KEY: 'openai-test',
    ORDER_SCAN_ALLOWED_ORIGINS: 'http://localhost:5174',
    ORDER_SCAN_LIVE_ENABLED: 'true',
  }))
    settings.set(key, value);
}

test('sem chave privada: falha antes de tocar no serviço', async () => {
  configure();
  settings.delete('OPENAI_API_KEY');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('Não deve chamar serviços.');
  };
  try {
    assert.equal((await handler(request())).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uma foto autenticada retorna rascunho e regista o consumo', async () => {
  configure();
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-1' });
    if (url.endsWith('/web_begin_order_scan')) return Response.json('attempt-1');
    if (url.endsWith('/responses/input_tokens')) return Response.json({ input_tokens: 3000 });
    if (url.endsWith('/v1/responses')) {
      const payload = JSON.parse(options.body);
      assert.equal(payload.model, 'gpt-5.4-mini');
      assert.equal(payload.max_output_tokens, 6000);
      assert.equal(
        payload.input[0].content.filter((part) => part.type === 'input_image').length,
        1,
      );
      return Response.json({
        status: 'completed',
        usage: { input_tokens: 3000, output_tokens: 700 },
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  clientName: { value: 'Maria', status: 'conferir' },
                  phone: { value: '935654112', status: 'provavel' },
                  responsibleName: { value: '', status: 'conferir' },
                  deliveryDate: { value: '2026-10-09', status: 'provavel' },
                  deliveryTime: { value: '10:00', status: 'provavel' },
                  items: [
                    {
                      category: 'Pastelaria',
                      product: 'Bolo',
                      quantityAmount: '2',
                      quantityUnit: 'KG',
                      notes: '',
                      status: 'provavel',
                    },
                  ],
                }),
              },
            ],
          },
        ],
      });
    }
    if (url.endsWith('/web_finish_order_scan')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_state, 'succeeded');
      assert.equal(body.p_actual_microusd, 5400);
      return Response.json(null);
    }
    throw new Error(`Destino inesperado: ${url}`);
  };
  try {
    const response = await handler(request());
    assert.equal(response.status, 200);
    const draft = await response.json();
    assert.equal(draft.clientName.value, 'Maria');
    assert.ok(draft.items[0].id);
    assert.equal(calls.length, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('imagem acima do teto de tokens não chama o modelo', async () => {
  configure();
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-1' });
    if (url.endsWith('/web_begin_order_scan')) return Response.json('attempt-2');
    if (url.endsWith('/responses/input_tokens')) return Response.json({ input_tokens: 9000 });
    if (url.endsWith('/web_finish_order_scan')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_state, 'failed');
      assert.equal(body.p_actual_microusd, 0);
      return Response.json(null);
    }
    throw new Error(`Destino inesperado: ${url}`);
  };
  try {
    assert.equal((await handler(request())).status, 422);
    assert.equal(
      calls.some((url) => url.endsWith('/v1/responses')),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejeição na contagem não chama a leitura nem cobra a reserva interna', async () => {
  configure();
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const logs = [];
  console.warn = (line) => logs.push(JSON.parse(line));
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: 'user-1' });
    if (url.endsWith('/web_begin_order_scan')) return Response.json('attempt-count-failed');
    if (url.endsWith('/responses/input_tokens'))
      return Response.json(
        { error: { code: 'invalid_api_key', message: 'Não deve aparecer nos logs: openai-test' } },
        { status: 401, headers: { 'x-request-id': 'request-test' } },
      );
    if (url.endsWith('/web_finish_order_scan')) {
      const body = JSON.parse(options.body);
      assert.equal(body.p_state, 'failed');
      assert.equal(body.p_actual_microusd, 0);
      return Response.json(null);
    }
    throw new Error(`Não deve gerar leitura: ${url}`);
  };
  try {
    assert.equal((await handler(request())).status, 503);
    assert.deepEqual(logs, [
      {
        event: 'order_scan_failed',
        stage: 'count_tokens',
        provider_status: 401,
        provider_code: 'invalid_api_key',
        provider_param: null,
        provider_request_id: 'request-test',
      },
    ]);
    assert.equal(JSON.stringify(logs).includes('openai-test'), false);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
