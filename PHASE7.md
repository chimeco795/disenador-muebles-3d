# Fase 7 — Operaciones y reporte

Se extiende el modelo de las fases anteriores sin sustituir su historial, procedencia ni plan optimizado.

## Uso

- Cortar ofrece transversal/largo y longitudinal/ancho también en tablas. Ambos descendientes conservan el origen. La optimización considera el ancho de las piezas y la sierra de ambos cortes.
- Q o Repetir última acción aplica el último corte, duplicación, desplazamiento, giro, visibilidad o acabado sobre la selección. Los desplazamientos y giros repiten sus deltas; las acciones incompatibles muestran un mensaje. No actúa desde campos de texto ni diálogos.
- El catálogo mantiene cinco destacados y añade categorías, búsqueda y materiales a medida persistentes. Los colores de los cortes se derivan del original mediante materials/color.ts.
- Perforar permite elegir cara con clic y colocar el centro o ajustar sus cotas. Corte angular está dentro de Cortar. Formas curvas incluye esquina, arco, semicírculo y agujero circular. Confirmar registra una entrada de historial y marca la pieza como utilizada.
- Crear unión, en Propiedades o Fabricación, permite elegir dos piezas y caras, tipo y datos opcionales. Editar/eliminar usan el historial habitual.
- Fabricación muestra acabados y Uniones / Ensamble en ambos planes. Generar reporte prefiere una propuesta optimizada vigente y completa; si está desactualizada pide regenerarla o usar expresamente el plan actual. PDF genera un documento vectorial, e Imprimir usa una hoja de taller separada del editor.

## Datos

Piece.operations guarda los acabados sobre las coordenadas locales de su base rectangular, independientes de la colocación 3D. Project.joins conserva referencias a piezas y caras, códigos legibles y parámetros de unión. Las uniones no se borran al eliminar/subdividir una pieza: se muestran para revisión. Su validez se calcula sobre las caras actuales y una firma de geometría, con tolerancias centralizadas en assembly/model.ts. Un movimiento conjunto que conserva el contacto conserva la unión válida.

Project.customMaterials, lastAction y los acabados/uniones se guardan con el proyecto. Los diálogos, borradores y vista del reporte son temporales. La validación admite proyectos anteriores sin estos campos. Los códigos existentes se usan en diseño, planes y reporte; nunca se imprimen UUID ni claves internas.

## Límites explícitos

- Los acabados se hacen después de cortar la base rectangular; la optimización trabaja con dicha base, no anida contornos irregulares. El material retirado por un acabado no se registra como sobrante rectangular. Para subdividir una pieza acabada hay que retirar sus acabados primero.
- Una pieza admite un corte angular y una forma exterior predefinida; permite varios agujeros. Las perforaciones pasantes superior/inferior abren la geometría; las ciegas y laterales se representan mediante marcas y parámetros de taller, sin simulación volumétrica de mecanizado.
- Las uniones son metadata. La comprobación de contacto usa caras de la base rectangular con 2 mm y 5° de tolerancia; no comprueba resistencia ni dimensiona herrajes. Los acabados que alteren una superficie requieren revisión del taller.
- PDF y la impresión pueden paginar distinto. El PDF asigna hojas de detalle a cada material y pieza con acabado; la impresora sigue sus propios ajustes. No es una plantilla 1:1.

## Validación

Pruebas unitarias de procedencia de cortes longitudinales, repetición, historial de uniones, invalidación, validación de persistencia, reporte y conservación de área/kerf. Prueba de navegador tests/phase7.spec.ts del flujo de corte → repetición → acabados → unión → optimización → PDF/impresión → recarga. TypeScript estricto y build de producción.

Resultado de la verificación: 63 pruebas unitarias y 3 pruebas de navegador (Fase 7, Fabricación y manipulación/cámara) aprobadas. Build de producción y TypeScript aprobados. PDF de prueba de 7 páginas renderizado y revisado: sin UUID, claves internas, texto cortado ni diagramas desbordados. Vite conserva el aviso de tamaño del paquete principal 3D.
