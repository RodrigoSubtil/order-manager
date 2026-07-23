import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible();
  await page.locator('#login-email').fill('gestor@alpha.test');
  await page.locator('#login-password').fill('segredo');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Painel de encomendas' })).toBeVisible();
}

async function createOrder(page: Page, clientName: string) {
  await page.getByRole('button', { name: 'Nova encomenda' }).click();
  await expect(page.getByRole('heading', { name: 'Adicionar encomenda' })).toBeVisible();

  await page.locator('#order-client-name').fill(clientName);
  await page.locator('#order-delivery-date').fill('2026-07-22');
  await page.locator("button[aria-controls='order-responsible-listbox']").click();
  await page.locator('#order-responsible-listbox button').click();
  await page.locator('#order-item-0-product').fill('Bolo');
  await page.locator('#order-item-0-product-listbox button').click();
  await page.locator('#order-item-0-quantity').fill('2');
  await page.getByRole('button', { name: 'Guardar encomenda' }).click();

  await page.getByRole('button', { name: 'Todas as datas' }).click();
  await expect(page.getByRole('heading', { name: clientName })).toBeVisible();
}

test.describe('Order Manager critical journey', () => {
  test('authenticates, creates, filters, prints, deletes and logs out through the API boundary', async ({
    page,
  }) => {
    const clientName = `Cliente E2E ${Date.now()}`;
    await signIn(page);
    await createOrder(page, clientName);

    await page.getByLabel('Pesquisar encomendas').fill(clientName);
    await expect(page.getByRole('heading', { name: clientName })).toBeVisible();

    await page.getByRole('button', { name: 'Imprimir todas' }).click();
    await expect(
      page.getByRole('heading', { name: 'Escolha o que deseja imprimir' }),
    ).toBeVisible();
    await page
      .getByRole('dialog', { name: 'Escolha o que deseja imprimir' })
      .getByRole('button', { name: 'Imprimir' })
      .click();
    await expect(page.locator('[data-print-root]')).toContainText(clientName);

    const orderCard = page.getByRole('article').filter({ hasText: clientName });
    await orderCard.getByRole('button', { name: 'Apagar' }).click();
    await page.getByRole('button', { name: 'Apagar encomenda' }).click();
    await expect(page.getByRole('heading', { name: clientName })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sair' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible();
  });

  test('keeps the login and authenticated dashboard free of automated accessibility violations', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible();
    await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] });

    await signIn(page);
    await expect(new AxeBuilder({ page }).analyze()).resolves.toMatchObject({ violations: [] });
  });
});
