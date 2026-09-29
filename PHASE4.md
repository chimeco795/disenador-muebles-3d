# Fase 4 — Materiales, trazabilidad y sobrantes

## Uso

Abre **＋ Materiales del proyecto** sobre la escena o desde Configuración. El panel utiliza el acoplamiento, redimensionamiento y cierre existentes. Inicialmente está cerrado para conservar el espacio de trabajo aprobado.

Cada alta del catálogo registra una tabla (`TABLA-001`) o una hoja (`HOJA-001`), sus dimensiones originales y su color. La selección muestra un código estable como A1. Cortar conserva el padre en el registro y asigna códigos nuevos a ambas partes (A2, A3); recortar conserva la misma letra y origen. Los códigos de padres no se reutilizan.

La primera parte de un corte se clasifica como utilizada y la segunda como sobrante disponible. En Propiedades, **Usar en el mueble** y **Reservar como sobrante** cambian esa clasificación. Ambas piezas siguen siendo seleccionables, móviles, recortables y del mismo pastel. Mover, bloquear u ocultar no cambia la clasificación.

El panel muestra material original, dimensiones, cantidad utilizada y disponible. Tablas usan mm de longitud equivalente a la sección original; hojas usan m². Las piezas sin cortar aparecen como material original disponible hasta marcarlas utilizadas o cortarlas.

## Datos

- `Material`: tipo del catálogo; `catalogMaterialId` conserva esa referencia.
- `StockRecord`: instancia original, con ID legible, familia, tipo, color y dimensiones inmutables durante los cortes.
- `Piece.sourceMaterialId` y `stockId`: referencia a esa instancia original, compartida por todos sus descendientes.
- `Piece.code`: identificador legible independiente del UUID técnico. Una letra por material, con numeración que incluye los padres históricos.
- `Piece.usage`: `original`, `used` o `available`.
- `CutRecord`: snapshot del padre, UUIDs de ambos hijos y medida/eje del corte; mantiene las relaciones incluso después de recortar o eliminar hijos.
- `archivedPieces`: piezas retiradas de la escena, conservadas con dimensiones, códigos y procedencia. No se cuentan como utilizadas ni disponibles; el panel indica la cantidad fuera de escena.
- `materialsVersion: 1`: extensión compatible del proyecto v1. La migración actualiza referencias antiguas sin modificar geometría, UUIDs, posiciones o colores. Los estados de cortes antiguos se infieren con la misma regla primera parte/segunda parte; el usuario puede cambiarlos.

El modelo y los cálculos están en `src/materials/project.ts`; la interfaz del resumen en `src/ui/ProjectMaterials.tsx`. Undo/Redo restaura la instantánea completa, incluidos materiales, códigos, archivos y cortes.

## Límites deliberados

- Duplicar registra un material independiente con las dimensiones de la copia; no busca sobrantes compatibles ni calcula compras comerciales.
- Eliminar conserva los datos pero no ofrece todavía un explorador de piezas archivadas. Deshacer permite recuperarlas durante la sesión. En proyectos antiguos, el material sin una pieza activa se informa fuera de escena, sin inventar estados históricos que no fueron guardados.
- El historial de deshacer y la distribución de paneles siguen siendo de sesión. Las piezas, sus estados y toda la trazabilidad se guardan en el navegador.
- No se implementan optimización, plan gráfico de corte, kerf real, compras, perforaciones, curvas, uniones ni CNC.

## Validación realizada

- `npm.cmd test`: 45 pruebas aprobadas.
- `npm.cmd run build`: TypeScript y producción correctos; aviso existente por tamaño del paquete 3D (~344 kB gzip).
- `npm.cmd run test:e2e`: 13 de 14 escenarios aprobados en la última ejecución conjunta. El escenario angular agotó 45 segundos; la repetición aislada (`tests/snap.spec.ts --grep "snap angular"`) pasó en 12,4 segundos sin cambiar código ni límites. Los 14 escenarios quedaron comprobados.
- Flujo nuevo en navegador: creación, corte, uso del sobrante, movimiento, recorte, Undo/Redo, panel acoplable, guardado y recarga. Migración de un guardado anterior verificada con dos recargas.
- Revisión visual del panel flotante, origen, cantidades y etiqueta de sobrante en selección.
