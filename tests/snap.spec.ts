import { test, expect, type Page } from '@playwright/test';
test.use({ channel: 'msedge', viewport: { width: 1440, height: 960 } });
const project = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('taller-project-v1')!).pieces);
async function exact(page: Page, label: string, value: number) { const details = page.locator('details'); if (await details.getAttribute('open') === null)
    await details.locator('summary').click(); await page.getByLabel(label, { exact: true }).fill(String(value)); await page.getByLabel(label, { exact: true }).press('Enter'); }
async function front(page: Page) { await page.getByLabel('Vista', { exact: true }).selectOption('Frontal'); await page.waitForTimeout(1500); }
async function scale(page: Page) { const zero = (await page.locator('.ruler-label').filter({ hasText: /^0$/ }).boundingBox())!; const thousand = (await page.locator('.ruler-label').filter({ hasText: /^1000$/ }).first().boundingBox())!; return Math.abs((zero.x + zero.width / 2) - (thousand.x + thousand.width / 2)) / 1000; }
async function center(page: Page, height = 40) { const tag = (await page.locator('.piece-code-tag').boundingBox())!; return { x: tag.x + tag.width / 2, y: tag.y + tag.height / 2 + (height / 2 + 250) * await scale(page) }; }
test('contacto, liberación, Alt, historial y persistencia mediante arrastre', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error')
        errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').nth(2).click();
    await page.locator('.material-card').nth(2).click();
    await exact(page, 'Posición Y', 180);
    await front(page);
    const initial = await project(page), c = await center(page), px = await scale(page);
    const cameraReference = await page.locator('.ruler-label').filter({ hasText: /^0$/ }).boundingBox();
    await page.mouse.move(c.x, c.y + 60);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y + 60 + (180 - 68) * px, { steps: 25 });
    await expect(page.locator('.snap-tag')).toContainText('Caras unidas');
    expect((await project(page))[1].position[1]).toBe(180);
    await page.screenshot({ path: 'tests/snap-faces.png' });
    const currentReference = (await page.locator('.ruler-label').filter({ hasText: /^0$/ }).boundingBox())!;
    expect(currentReference.x).toBeCloseTo(cameraReference!.x, 1);
    expect(currentReference.y).toBeCloseTo(cameraReference!.y, 1);
    // The same gesture can leave the capture zone, then approach again.
    await page.mouse.move(c.x, c.y + 60 + (180 - 140) * px, { steps: 12 });
    await expect(page.locator('.snap-tag')).not.toContainText('Caras unidas');
    await page.mouse.move(c.x, c.y + 60 + (180 - 68) * px, { steps: 12 });
    await expect(page.locator('.snap-tag')).toContainText('Caras unidas');
    await page.keyboard.down('Alt');
    await expect(page.locator('.snap-tag')).toContainText('Movimiento libre');
    await page.keyboard.up('Alt');
    await expect(page.locator('.snap-tag')).toContainText('Caras unidas');
    await page.mouse.up();
    await expect(page.locator('.snap-tag')).toHaveCount(0);
    expect((await project(page))[1].position[1]).toBeCloseTo(60, 4);
    expect((await project(page))[0]).toEqual(initial[0]);
    await page.keyboard.press('Control+z');
    expect((await project(page))[1].position[1]).toBe(180);
    await page.keyboard.press('Control+Shift+z');
    expect((await project(page))[1].position[1]).toBeCloseTo(60, 4);
    await page.reload();
    expect((await project(page))[1].position[1]).toBeCloseTo(60, 4);
    expect(errors).toEqual([]);
});
test('guías de centros y bordes durante el movimiento', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').nth(2).click();
    await page.locator('.material-card').nth(1).click();
    // Both boards are 2400mm long but widths differ. Keep them nearby with no overlapping face.
    await exact(page, 'Posición Z', 160);
    await exact(page, 'Posición X', 90);
    await front(page);
    // In the front view the X handle is horizontal; use the visible ruler spacing.
    const c = await center(page, 18);
    const px = await scale(page);
    await page.mouse.move(c.x - 60, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x - 60 - 90 * px, c.y, { steps: 25 });
    await expect(page.locator('.snap-tag')).toContainText('✓ Centros X');
    await page.mouse.up();
    expect((await project(page))[1].position[0]).toBeCloseTo(0, 2);
    await page.getByRole('button', { name: '× Eliminar', exact: true }).first().click();
    await page.locator('.material-card').first().click();
    await exact(page, 'Posición Z', 160);
    await exact(page, 'Posición X', 360);
    await front(page);
    const edgeCenter = await center(page, 18), edgeScale = await scale(page);
    await page.mouse.move(edgeCenter.x - 60, edgeCenter.y);
    await page.mouse.down();
    await page.mouse.move(edgeCenter.x - 60 - 60 * edgeScale, edgeCenter.y, { steps: 25 });
    await expect(page.locator('.snap-tag')).toContainText('✓ Bordes X');
    await page.screenshot({ path: 'tests/snap-edge.png' });
    await page.mouse.up();
    expect((await project(page))[1].position[0]).toBeCloseTo(300, 2);
});
test('snap angular a 45 y 90 grados, y giro libre posterior', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error')
        errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').first().click();
    await page.waitForTimeout(1700);
    await page.getByRole('button', { name: '↻ Rotar' }).click();
    await page.mouse.move(775, 464);
    await page.mouse.down();
    const captures = new Set<number>();
    let free = false;
    for (let step = 1; step <= 125; step++) {
        await page.mouse.move(775 - step * .45, 464 - step);
        const text = await page.locator('.snap-tag').textContent();
        if (!text)
            continue;
        const value = Math.abs(parseFloat(text));
        if (text.includes('Ajuste angular') && (value === 45 || value === 90)) {
            captures.add(value);
            if (value === 45) {
                await expect(page.locator('.dimension-tag')).toContainText('45.0°');
                await page.screenshot({ path: 'tests/snap-angle.png' });
            }
        }
        if (captures.has(90) && text.includes('Giro libre')) {
            free = true;
            break;
        }
    }
    await page.mouse.up();
    expect([...captures].sort()).toEqual([45, 90]);
    expect(free).toBe(true);
    const final = await project(page);
    expect(Math.max(...final[0].rotation.map(Math.abs))).toBeGreaterThan(90);
    await page.keyboard.press('Control+z');
    expect((await project(page))[0].rotation).toEqual([0, 0, 0]);
    await page.keyboard.press('Control+Shift+z');
    expect((await project(page))[0].rotation).toEqual(final[0].rotation);
    expect(errors).toEqual([]);
});
test('cancelar un gesto elimina las guías y libera la cámara', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').nth(2).click();
    await page.locator('.material-card').nth(2).click();
    await exact(page, 'Posición Y', 180);
    await front(page);
    const c = await center(page), px = await scale(page);
    await page.mouse.move(c.x, c.y + 60);
    await page.mouse.down();
    await page.mouse.move(c.x, c.y + 60 + 112 * px, { steps: 20 });
    await expect(page.locator('.snap-tag')).toContainText('Caras unidas');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect(page.locator('.snap-tag')).toHaveCount(0);
    expect((await project(page))[1].position[1]).toBe(180);
    const before = await page.locator('canvas').screenshot();
    await page.mouse.move(940, 650);
    await page.mouse.down();
    await page.mouse.move(1000, 690, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    expect(before.equals(await page.locator('canvas').screenshot())).toBe(false);
});
