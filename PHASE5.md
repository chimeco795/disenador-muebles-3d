# Fase 5 — Fabricación y cortes en dos direcciones

## Uso

- **Diseño | Fabricación** cambia entre el editor existente y una hoja de taller 2D. El diseño y la cámara se conservan al volver.
- Las tablas/listones mantienen su corte por longitud. Los tableros muestran **Corte vertical ↕** (divide el largo) y **Corte horizontal ↔** (divide el ancho). Son direcciones locales del tablero; la cámara puede hacer que se vean inclinadas en pantalla.
- La línea atraviesa la pieza. Puedes arrastrarla, usar flechas o introducir una medida. Las medidas resultantes muestran largo × ancho × espesor y descuentan el ancho de sierra.
- **Ancho de corte de sierra (kerf)** se configura en Fabricación o Configuración del editor. El valor inicial es 0 mm, compatible con proyectos previos. Se guarda al salir del campo o pulsar Enter.
- El kerf solo aplica a cortes nuevos. Cada corte guarda su propio valor: cambiar la configuración no redimensiona piezas ya fabricadas. No se permite cortar si no caben ambas piezas mínimas y la sierra.
- En Fabricación, selecciona **Tabla #N / Hoja #N** para ver exclusivamente ese material. El resumen y la lista inferior abarcan el proyecto completo, con sus IDs, dimensiones, origen y estado.
- Verde identifica material disponible/sobrantes; azul, piezas utilizadas; gris, material retirado de la escena; ocre, pérdida de sierra. Las tarjetas debajo del diagrama muestran todas las dimensiones, incluidas piezas demasiado pequeñas para contener texto legible.

## Modelo y persistencia

La fabricación es una proyección de los datos existentes, no una segunda copia del proyecto. `src/manufacturing/plan.ts` recorre `CutRecord` desde `StockRecord.rootPieceId` y reconstruye rectángulos en el material original. El primer hijo ocupa `offset`; el segundo comienza en `offset + kerf`. Cortes horizontales y verticales pueden combinarse sobre cualquier descendiente.

El plan usa coordenadas locales del material original, no las posiciones o giros del mueble. Mover, rotar u ocultar una pieza no cambia de dónde salió. Se conservan `sourceMaterialId`, `stockId`, códigos y padres históricos. Las piezas archivadas aparecen fuera de la escena y no como sobrantes disponibles.

`Project.sawKerf` guarda la configuración; cada `CutRecord` guarda `axis`, `offset` y `kerf`. Undo/Redo incluye estos datos. Tras recargar se reconstruyen los mismos diagramas. La pestaña abierta, el material seleccionado y el foco del diagrama son preferencias de sesión.

El balance separa utilizado, disponible, pérdida de sierra y material fuera de escena. Tablas usan longitud equivalente a la sección original; hojas usan superficie. Los contadores de tablas/hojas utilizadas cuentan fuentes con al menos una pieza marcada utilizada; el inventario registrado también incluye fuentes todavía sin usar.

## Límites

- Selector de orientación explícito; no se infiere la dirección por proximidad del cursor.
- Distribución basada exclusivamente en cortes realizados. No hay optimización, nesting, compras, curvas, perforaciones, uniones ni CNC.
- Tablas conservan proporciones de longitud y amplían el ancho para legibilidad. Hojas conservan la relación de sus dimensiones. No es una plantilla física a escala 1:1.
- Los cortes anteriores mantienen su kerf original (0 mm en proyectos previos). No hay ajuste retroactivo.
- Piezas muy pequeñas se consultan en sus tarjetas y la tabla, evitando textos superpuestos en el diagrama.
- Duplicar sigue registrando material independiente, como en Fase 4. No se reasigna automáticamente a sobrantes.
- No se implementó exportación PDF. La vista está organizada en secciones independientes para una futura hoja de taller.

## Retoma

Al retomar ya estaban implementados modelo, UI de cortes, Fabricación, resúmenes, diagramas y kerf, con cinco pruebas unitarias específicas. Se completó la validación integral en navegador, se corrigió el ajuste de texto de segmentos cortos y se documentaron el comportamiento y los límites. Se reutilizaron las pruebas previas de cortes y manipulación/cámara.

## Validación final de la retoma

- `npm.cmd test`: 50 pruebas unitarias aprobadas, incluidas las 5 específicas de fabricación.
- `npm.cmd run test:e2e -- tests/manufacturing.spec.ts tests/cutting.spec.ts tests/direct.spec.ts`: 7 escenarios aprobados. Se comprobó el flujo completo, el arrastre real de la línea horizontal, diagramas SVG con posiciones y dimensiones exactas, kerf, Undo/Redo, guardar/recargar y las regresiones de cortes y cámara relacionadas.
- Revisión visual de capturas: diagrama de tabla 720 + 450 + 1830, hoja con tres cortes alternados y previsualización horizontal.
