# Fase 6 — Optimización de material

## Uso

En **Fabricación**, conserva **Plan actual** para consultar los cortes realizados en el diseño. **Plan optimizado** muestra una propuesta independiente. **Optimizar material** ejecuta el cálculo explícitamente: no se recalcula durante los gestos 3D.

Se incluyen solamente piezas con estado **Pieza utilizada**. Para incorporar una pieza entera o un sobrante al conjunto requerido, selecciona **Usar en el mueble** en Propiedades. Piezas ocultas o bloqueadas marcadas utilizadas también se fabrican. Los sobrantes disponibles son candidatos de suministro, no piezas requeridas.

Opciones:

- **Permitir rotación de piezas: 90°** para hojas.
- **Considerar sobrantes existentes**, comparando también contra una distribución sin reutilización.
- **Kerf**: utiliza la configuración existente de Fabricación.

Los diagramas distinguen material nuevo, sobrante reutilizado, piezas requeridas, nuevos sobrantes y pérdida de sierra. Las tablas incluyen orden de cortes; las hojas muestran distribución rectangular con giros identificados. La lista de material separa nuevas unidades comerciales y sobrantes reutilizados, sin precios.

El modelo 3D, IDs, colores, posiciones, dimensiones, trazabilidad y cortes actuales no cambian al optimizar. Reutilizar un sobrante es una propuesta: no lo consume ni lo cambia de estado en Diseño.

## Algoritmos

- `src/optimization/boards.ts`: Best Fit Decreasing sobre la longitud. Mantiene sección y material compatibles. Se prueban material nuevo solamente y una variante que aprovecha sobrantes.
- `src/optimization/sheets.ts`: colocación en rectángulos libres mediante divisiones de guillotina. Prueba órdenes por área y lado mayor, ambas orientaciones permitidas y dos direcciones de división. No hay solapamientos ni cortes atravesando piezas ya colocadas.
- `src/optimization/packing.ts`: apertura de fuentes, elección de huecos, consumo único de sobrantes y comparación de propuestas. Prioriza cubrir todas las piezas, después menos unidades nuevas, menor volumen nuevo y menor volumen total abierto. Puede descartar sobrantes si obligan a abrir más material sin reducir la compra.
- `src/optimization/supplies.ts`: piezas requeridas, catálogo, sobrantes, compatibilidad y firma determinista de datos de entrada. No mezcla referencias comerciales distintas ni espesores incompatibles.
- `src/optimization/kerf.ts`: descuento compartido por ambos algoritmos. Un corte consume su franja completa; un ajuste exacto al borde no necesita corte adicional. El remanente después de la última pieza también requiere la separación correspondiente. Se rechaza un ajuste donde no cabe el ancho completo de la sierra, salvo coincidencia exacta con el borde.

En 2D se contabilizan franjas rectangulares de sierra, según el alcance de cada división. Piezas + sobrantes + sierra conservan el área/volumen de cada fuente. Los porcentajes globales se calculan por volumen para no mezclar longitudes de tablas con superficies de hojas.

## Datos, persistencia e historial

- `Project.optimizerSettings`: rotación y reutilización.
- `Project.optimizedPlan`: configuración utilizada, kerf, firma, fuentes propuestas, ubicaciones, cortes, sobrantes y piezas sin ubicar.
- `Piece.cutRotationAllowed`: restricción individual preparada para futura dirección de veta; no existe lógica avanzada ni configuración de veta en esta fase.
- Cada ubicación conserva la pieza requerida y su ID/origen del diseño; las fuentes de la propuesta tienen identificadores independientes.

La firma incluye dimensiones, IDs, estados de demanda/sobrantes, materiales, catálogo, fuentes, permisos de giro, kerf y opciones. Si cambia, el plan se muestra como **desactualizado** hasta volver a ejecutar la acción. Mover, girar, ocultar o bloquear en 3D no altera necesidades de fabricación y no invalida por sí solo la propuesta. El cambio de una pieza de utilizada a disponible sí la invalida.

El cálculo y sus opciones tienen Undo/Redo y se guardan en el mismo proyecto. Al recargar, se valida y recupera la propuesta, incluso si estaba desactualizada. Si la sección opcional de optimización está dañada, se conserva el diseño válido y se descarta solo la propuesta/configuración dañada.

## Límites

- Heurísticas deterministas, no óptimo matemático garantizado. Pensadas para proyectos de muebles, sin búsqueda exhaustiva ni prueba de carga industrial.
- Solo formatos comerciales del catálogo existente. No se comparan formatos alternativos equivalentes ni se crean medidas comerciales personalizadas.
- Se reutilizan piezas marcadas **sobrante disponible**; los originales sin marcar utilizados no se consideran demanda ni sobrantes. La lista nueva supone suministro desde el catálogo.
- No hay asignación definitiva, reserva de inventario o aplicación del resultado al modelo. El usuario decide cuándo fabricar.
- No se modela veta avanzada, márgenes de saneado, ancho parcial de sierra fuera del borde, nesting irregular, precios, CNC, PDF, perforaciones ni uniones.
- Si una pieza no cabe, la propuesta se marca incompleta y se enumera explícitamente. La lista de compra cubre solo las piezas ubicadas; no se presenta como solución completa.
- Diagrama a proporción aproximada y tarjetas para piezas pequeñas. Las tablas amplían visualmente el ancho. Los números de Tabla/Hoja pertenecen a la propuesta y no reemplazan IDs de origen.
- Se muestran cantidades y comparación de fuentes, no ahorro monetario ni una garantía de ahorro en todos los proyectos.

## Validación

- `npm.cmd test`: 59 pruebas unitarias aprobadas. Nueve pruebas nuevas incluyen ajuste exacto con kerf, reutilización sin empeorar la compra, rotación/restricción individual, incompatibilidades, determinismo, firma e historial. Dieciséis conjuntos rectangulares reproducibles verifican cobertura, límites, ausencia de solapamientos y conservación de área.
- `npm.cmd run test:e2e`: 17 escenarios aprobados, incluidas todas las regresiones existentes de Fases 1–5 y los dos flujos nuevos del optimizador.
- Flujo 1: plan actual → propuesta con sobrante → lista de compra sin reutilización → recorte de una pieza → aviso desactualizado → cálculo nuevo → Undo/Redo de configuración → persistencia del resultado y del estado desactualizado.
- Flujo 2: una pieza de 1200 × 700 cabe girada en un sobrante de 1000 × 1220; sin rotación se solicita hoja nueva. El resultado vuelve a ser idéntico al rehabilitar el giro y recargar.
- Build y TypeScript correctos. Permanece el aviso de tamaño del paquete 3D (~353 kB gzip).
