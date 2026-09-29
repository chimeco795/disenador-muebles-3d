import { test, expect, type Page } from '@playwright/test';
test.use({ channel: 'msedge', viewport: { width: 1440, height: 960 } });
const read = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('taller-project-v1')!));
async function cut(page: Page, length: number) {
    await page.getByRole('button', { name: '✂ Cortar', exact: true }).click();
    await page.locator('.cut-measure').click();
    await page.getByLabel('Medida de corte').fill(String(length));
    await page.getByLabel('Medida de corte').press('Enter');
    await page.getByRole('button', { name: '✓ Confirmar corte' }).click();
}
test('material original → corte → reutilización → recorte → historial → recarga y panel acoplable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').first().click();
    await expect(page.locator('.piece-code-tag')).toHaveText('A1');
    expect((await read(page)).stocks[0].id).toBe('TABLA-001');
    await cut(page, 720);
    await page.locator('.piece-select').nth(1).click();
    await expect(page.locator('.piece-code-tag')).toHaveText('A3 · Sobrante');
    await page.getByRole('button', { name: 'Usar en el mueble', exact: true }).click();
    await expect(page.locator('.piece-code-tag')).toHaveText('A3');
    await page.locator('details summary').click();
    await page.getByLabel('Posición Y', { exact: true }).fill('400');
    await page.getByLabel('Posición Y', { exact: true }).press('Enter');
    const reused = await read(page);
    await cut(page, 450);
    const recut = await read(page);
    expect(recut.pieces.map((p: any) => p.length)).toEqual([720, 450, 1830]);
    expect(recut.pieces.map((p: any) => p.sourceMaterialId)).toEqual(['TABLA-001', 'TABLA-001', 'TABLA-001']);
    await page.keyboard.press('Control+z');
    expect(await read(page)).toEqual(reused);
    await page.keyboard.press('Control+Shift+z');
    expect(await read(page)).toEqual(recut);
    await page.getByRole('button', { name: '＋ Materiales del proyecto', exact: true }).click();
    await expect(page.locator('.stock-card')).toContainText('Utilizado1,170 mmDisponible1,830 mm');
    await expect(page.locator('.material-summary')).toContainText('1 sobrante disponible');
    await page.getByLabel('Acoplar Materiales del proyecto', { exact: true }).selectOption('bottom');
    await expect(page.locator('.bottom-dock .project-materials')).toBeVisible();
    await page.getByLabel('Cerrar Materiales del proyecto', { exact: true }).click();
    await page.getByRole('button', { name: '▣ Guardar', exact: true }).click();
    await page.reload();
    await expect(page.locator('.piece-row')).toHaveCount(3);
    expect(await read(page)).toEqual(recut);
    await page.locator('.piece-select').nth(2).click();
    await expect(page.locator('.piece-code-tag')).toHaveText('A5 · Sobrante');
    await page.getByRole('button', { name: '＋ Materiales del proyecto', exact: true }).click();
    await page.screenshot({ path: 'tests/materials-project.png' });
    expect(errors).toEqual([]);
});
test('migra un guardado de Fase 3 y persiste su procedencia sin alterar las piezas', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.locator('.material-card').first().click();
    await cut(page, 720);
    const before = await read(page);
    await page.evaluate(() => {
        const project = JSON.parse(localStorage.getItem('taller-project-v1')!);
        delete project.materialsVersion;
        project.stocks[0].id = 'legacy-stock';
        for (const piece of [...project.pieces, ...project.cuts.map((c: any) => c.parent)]) {
            piece.sourceMaterialId = piece.catalogMaterialId;
            piece.stockId = 'legacy-stock';
            delete piece.catalogMaterialId;
            delete piece.code;
            delete piece.usage;
        }
        project.cuts.forEach((c: any) => c.stockId = 'legacy-stock');
        localStorage.setItem('taller-project-v1', JSON.stringify(project));
    });
    await page.reload();
    await expect(page.locator('.piece-row')).toHaveCount(2);
    const upgraded = await read(page);
    expect(upgraded.materialsVersion).toBe(1);
    expect(upgraded.pieces.map((p: any) => [p.id, p.position, p.rotation, p.color])).toEqual(before.pieces.map((p: any) => [p.id, p.position, p.rotation, p.color]));
    expect(upgraded.pieces.map((p: any) => [p.sourceMaterialId, p.code, p.usage])).toEqual([
        ['TABLA-001', 'A2', 'used'], ['TABLA-001', 'A3', 'available']
    ]);
    await page.reload();
    await expect(page.locator('.piece-row')).toHaveCount(2);
    expect(await read(page)).toEqual(upgraded);
});
