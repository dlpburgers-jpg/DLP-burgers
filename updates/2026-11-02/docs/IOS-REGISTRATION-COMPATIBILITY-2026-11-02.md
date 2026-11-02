# Registro en la app instalada de iOS

El servicio creaba y habilitaba correctamente la cuenta, pero la versión instalada esperaba `pending:true` y mostraba un error genérico al recibir `created:true,pending:false`. Los intentos recientes se comprobaron como creados y confirmados; no se cambiaron sus contraseñas ni se duplicaron cuentas.

Mitigación publicada en dlp-users v15: para clientes nativos antiguos, se devuelve un aviso explícito de cuenta creada y habilitada, con instrucciones de tocar **Ya tengo cuenta** e ingresar. Se usa el campo que la app antigua ya muestra como aviso; por eso puede conservar el estilo visual de error de esa versión. No se simula un estado pendiente ni se vuelve a pedir habilitación por WhatsApp. Los clientes web actuales siguen recibiendo su respuesta habitual.

La próxima compilación nativa envía `registrationVersion:2` y muestra la pantalla normal **Cuenta creada**. Se actualizó PhoneRegistration y se agregó `scripts/build-reviewed-ios.mjs` para preparar recursos desde la versión revisada, evitando reconstruir diferencias históricas ajenas a este arreglo.

Validación: 17 pruebas de registro y acceso aprobadas, incluyendo cliente nativo antiguo, nuevo, web, reintentos sin duplicación ni cambio de contraseña y controles de acceso. No se crearon cuentas de prueba en producción.

Pendiente: compilar y firmar en macOS, subir a TestFlight/App Store y distribuir una nueva versión. Desde Windows y sin un servicio de compilación/firma Apple conectado no se puede publicar un binario iOS. La publicación web no actualiza los recursos incorporados en la app instalada.

En el checkout completo de Sites, con dependencias instaladas, preparar en macOS:

```sh
node scripts/build-reviewed-ios.mjs
npx cap sync ios
node scripts/prepare-ios.mjs
npx cap open ios
```

Luego aumentar el número de build, seleccionar la firma existente, archivar y distribuir en Xcode. No ejecutar `mobile:sync` después de preparar estos recursos, porque ese comando reconstruye el árbol histórico de fuentes. El repositorio público contiene snapshots parciales; se necesita el checkout completo de Sites para compilar el proyecto nativo.
