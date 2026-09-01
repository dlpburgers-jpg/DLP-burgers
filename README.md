# Burger Club MVP

Primera versión funcional, sin backend externo, para validar el flujo del negocio antes de conectar Supabase / WhatsApp / push remoto.

## Qué funciona

- Registro/login local de clientes.
- Login admin demo.
- Catálogo administrable (alta/eliminación de productos y categorías base).
- Menú, carrito y creación de pedidos.
- Panel de pedidos con estados: pendiente → aceptado → preparando → listo → en camino → entregado.
- Al pasar a “en camino”, se crea una notificación transaccional para ese cliente.
- Al marcar “entregado”, se acreditan puntos según la regla configurada.
- Historial de puntos.
- Beneficio de cumpleaños con producto configurable y un canje máximo por año.
- Preferencias separadas para push de pedidos y push comercial.
- Automatización de reactivación por inactividad con días y cooldown configurables.
- Dashboard admin y listado de clientes.
- Persistencia en localStorage.

## Cómo ejecutarlo

No requiere instalar dependencias. Desde esta carpeta:

```bash
python3 -m http.server 8080
```

Abrir en el navegador:

```text
http://localhost:8080
```

## Acceso admin demo

En la pantalla “Ingresar”, usar el botón **Entrar como admin demo**.

## Push

El MVP usa la API `Notification` del navegador cuando hay permiso, pero las notificaciones remotas reales requieren un backend y un proveedor (por ejemplo Web Push/FCM). La lógica del evento “pedido en camino” y la automatización de 14 días ya están modeladas.

## Próxima etapa técnica recomendada

1. Migrar `localStorage` a Supabase/PostgreSQL.
2. Activar Supabase Auth y políticas RLS.
3. Crear Storage para fotos.
4. Implementar Service Worker + Web Push/FCM.
5. Ejecutar automatizaciones en backend/cron.
6. Integrar WhatsApp Business Platform.
7. Agregar variantes, extras, zonas de delivery y pagos.
