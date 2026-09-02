# DLP Burgers MVP V4

Demo local-first de pedidos, fidelización y delivery.

## Novedades V4
- Google Maps JavaScript API + Places Autocomplete (se activa al cargar una API key desde Admin > Delivery).
- Administrador puede dibujar polígonos de zonas tocando puntos sobre el mapa.
- Cada zona tiene nombre, valor de envío, pedido mínimo, prioridad y estado activo/inactivo.
- Si dos zonas se superponen, se usa la de mayor prioridad.
- Cliente puede elegir Retiro o Delivery.
- Dirección por Google Maps, ubicación actual, pin y cálculo automático de zona/envío.
- Pedidos guardan dirección, coordenadas, zona, costo de envío y notas de entrega.

## Importante
Esta demo sigue usando localStorage: los datos no se sincronizan entre dispositivos. Para producción se requiere backend (por ejemplo Supabase) y una Google Maps API key restringida por dominio.
