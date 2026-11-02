# Contraseñas visibles y solicitud de clave provisoria

Ingreso y registro incorporan un botón Ver/Ocultar contraseña. La clave comienza oculta, conserva su valor al alternar y el botón no envía el formulario. Los controles tienen etiqueta accesible, estado anunciado y un área táctil de al menos 44 px.

El botón Solicitar clave provisoria abre un WhatsApp a la cuenta configurada de DLP. Incluye el celular/correo/usuario ingresado, nunca la contraseña. El cliente debe enviar el mensaje. DLP verifica su identidad y usa la función existente en Usuarios para generar y entregar la clave provisoria; el sistema exige cambiarla al ingresar. No se agregó un restablecimiento anónimo ni se modificaron permisos del servicio.

El circuito de recuperación por correo de las cuentas existentes sigue disponible. La solicitud por WhatsApp también se muestra al ingresar desde una sesión anónima.

Validación: interfaz comprobada con claves ficticias, alternancia independiente en ingreso y registro, conservación del campo, ausencia de envíos involuntarios y contenido del enlace de recuperación sin contraseña. No se enviaron mensajes a DLP ni se cambiaron claves reales. La suite completa existente se ejecutó después del cambio.

Publicar la web no actualiza automáticamente las apps nativas instaladas. Los paquetes de actualización Android/iOS incorporan estos recursos y requieren compilación, firma y distribución por las tiendas.
