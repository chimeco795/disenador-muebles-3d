import { test, expect } from '@playwright/test';
test.use({ channel: 'msedge', viewport: { width: 1440, height: 960 } });
test('manipulación directa, selección y cámara', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error')
        errors.push(m.text()); });
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').first().click();
    await page.waitForTimeout(1700);
    const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('taller-project-v1')!).pieces[0]);
    const initial = await read();
    // Grab the actual Y arrow, not the scene background.
    await page.mouse.move(717, 408);
    await page.mouse.down();
    await page.mouse.move(717, 325, { steps: 20 });
    await page.mouse.up();
    const moved = await read();
    expect(moved.position[1]).toBeGreaterThan(initial.position[1] + 100);
    expect(moved.position[0]).toBe(initial.position[0]);
    await page.keyboard.press('Control+z');
    expect((await read()).position).toEqual(initial.position);
    await page.locator('.piece-select').first().click();
    await page.getByRole('button', { name: '↻ Rotar' }).click();
    await page.mouse.move(775, 464);
    await page.mouse.down();
    await page.mouse.move(792, 497, { steps: 20 });
    await expect(page.locator('.dimension-tag')).toContainText('°');
    await page.mouse.up();
    expect((await read()).rotation.some((n: number) => Math.abs(n) > 1)).toBe(true);
    await page.keyboard.press('Control+z');
    expect((await read()).rotation).toEqual([0, 0, 0]);
    // A click on the visible board selects it, an empty click clears selection.
    await page.getByLabel('Vista', { exact: true }).selectOption('Superior');
    await page.waitForTimeout(1200);
    const box = (await page.locator('canvas').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.dimension-tag').first()).toBeVisible();
    await page.mouse.click(1030, 680);
    await expect(page.locator('.dimension-tag')).toHaveCount(0);
    // Orbit, zoom and pan must change the rendered scene without changing the object.
    const before = await read();
    const canvas = page.locator('canvas');
    const shot1 = await canvas.screenshot();
    await page.mouse.move(950, 620);
    await page.mouse.down();
    await page.mouse.move(1000, 660, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const shot2 = await canvas.screenshot();
    expect(shot1.equals(shot2)).toBe(false);
    expect(await read()).toEqual(before);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(400);
    const shot3 = await canvas.screenshot();
    expect(shot2.equals(shot3)).toBe(false);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(950, 620, { steps: 10 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(400);
    expect(shot3.equals(await canvas.screenshot())).toBe(false);
    expect(await read()).toEqual(before);
    expect(errors).toEqual([]);
});

