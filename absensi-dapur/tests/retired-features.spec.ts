import { expect, test } from '@playwright/test';

test('removed feature APIs and assets are unavailable', async ({ request }) => {
  for (const path of [
    '/api/game/leaderboard',
    '/api/game/skor',
    '/api/game/turnamen',
    '/api/game/turnamen/1',
    '/api/admin/harga-pasar',
    '/api/admin/notifikasi',
    '/api/me/pengingat',
    '/game/blok-gizi.html',
    '/audio/musik-latar.mp3',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test.describe('retired features in authenticated pages', () => {
  test.skip(!process.env.UI_STORAGE_STATE, 'Requires a local or staging account storage state.');
  test.use({ storageState: process.env.UI_STORAGE_STATE });

  test('attendance and menu work without retired feature requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(new URL(request.url()).pathname));

    await page.goto('/dapur');
    await expect(page.locator('#konten-utama')).toBeVisible();
    await expect(page.getByRole('link', { name: /Game Blok Gizi|🎮 Game/ })).toHaveCount(0);
    await expect(page.locator('audio')).toHaveCount(0);

    await page.goto('/admin/menu');
    await expect(page.getByRole('heading', { name: 'Bank Menu & Kalkulasi Bahan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifikasi', exact: true })).toHaveCount(0);
    await expect(page.getByText('Harga Pasar · SISKAPERBAPO Jatim')).toHaveCount(0);

    expect(requests.filter(path =>
      path.startsWith('/api/game') ||
      ['/api/admin/harga-pasar', '/api/admin/notifikasi', '/api/me/pengingat', '/api/me/card'].includes(path)
    )).toEqual([]);
  });
});
