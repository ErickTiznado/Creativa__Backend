# MÓDULO AUTH - Guía de Implementación Detallada (Sin Código)

**Estado Actual:** 2/5 funcionalidades (40%) | **Pendientes:** 3 tareas

**Nota:** Esta guía describe pasos algorítmicos detallados sin incluir código. Utiliza PatternBuilder de `nicola-framework` para validaciones.

---

## 📖 ÍNDICE

1. [Tarea 1: Recuperación de Contraseña](#tarea-1-recuperación-de-contraseña)
2. [Tarea 2: Actualización de Perfil](#tarea-2-actualización-de-perfil)
3. [Tarea 3: Sistema de Roles y Permisos](#tarea-3-sistema-de-roles-y-permisos)
4. [Orden de Implementación](#orden-sugerido-de-implementación)
5. [Testing Completo](#testing-del-sistema-de-roles)
6. [Troubleshooting](#troubleshooting-común)
7. [Mejores Prácticas](#mejores-prácticas-de-seguridad)

---

## 🔐 CONCEPTOS CLAVE

### PatternBuilder vs Regex Nativa

**PatternBuilder es preferido porque:**

- ✅ Escaping automático de caracteres especiales
- ✅ API humanizada y mantenible
- ✅ Debugging sencillo con `.debug()`
- ✅ Composable y reutilizable
- ✅ Menor probabilidad de errores

**Ejemplo conceptual:**

```
Validar email@dominio.com
├─ Regex nativa:  /^\w+@\w+\.\w+$/ ← prone a errores
└─ PatternBuilder: startOfLine().word().oneOrMore()... ← legible
```

### Arquitectura de Seguridad en Capas

```
┌─────────────────────────────────────┐
│   Cliente (Frontend)                │
│   - Validación de UX                │
│   - Mensajes inmediatos             │
└───────────┬─────────────────────────┘
            │ HTTP Request
            ▼
┌─────────────────────────────────────┐
│   Middleware requireAuth            │
│   - Verifica token JWT              │
│   - Adjunta req.user                │
└───────────┬─────────────────────────┘
            │ Token válido
            ▼
┌─────────────────────────────────────┐
│   Middleware requireRole            │
│   - Consulta rol en BD              │
│   - Valida permisos                 │
└───────────┬─────────────────────────┘
            │ Autorizado
            ▼
┌─────────────────────────────────────┐
│   Controller / Business Logic       │
│   - Validaciones de negocio         │
│   - Operaciones en BD               │
└─────────────────────────────────────┘
```

---

## TAREA 1: RECUPERACIÓN DE CONTRASEÑA

**Prioridad:** 🔴 ALTA  
**Archivos a modificar:** 2

### Paso 1.1: Crear Método `forgotPassword`

**Ubicación:** `src/controllers/AuthController.js`

#### Diagrama de Flujo:

```
┌─────────────────────────────────────┐
│   Inicio: Recibir Request           │
└───────────┬─────────────────────────┘
            ▼
┌─────────────────────────────────────┐
│   Extraer email del body            │
└───────────┬─────────────────────────┘
            ▼
      ┌─────────────┐
      │ ¿Email      │──NO──▶ Error 400
      │ presente?   │         "Email obligatorio"
      └─────┬───────┘
            │ SÍ
            ▼
┌─────────────────────────────────────┐
│   Validar formato con PatternBuilder│
└───────────┬─────────────────────────┘
            ▼
      ┌─────────────┐
      │ ¿Formato    │──NO──▶ Error 400
      │ válido?     │         "Formato inválido"
      └─────┬───────┘
            │ SÍ
            ▼
┌─────────────────────────────────────┐
│   Llamar resetPasswordFor Email     │
│   (Supabase)                        │
└───────────┬─────────────────────────┘
            ▼
      ┌─────────────┐
      │ ¿Error de   │──SÍ──▶ Error 500
      │ Supabase?   │         "Error procesando"
      └─────┬───────┘
            │ NO
            ▼
┌─────────────────────────────────────┐
│   Retornar 200 + mensaje genérico  │
│   (NO revelar si email existe)      │
└─────────────────────────────────────┘
```

#### Algoritmo Detallado:

1. **Extraer datos del request**
   - Obtener el campo `email` del cuerpo de la petición
   - Almacenar en variable local

2. **Validar presencia del email**
   - Verificar que `email` no sea nulo
   - Verificar que `email` no sea cadena vacía
   - SI alguna condición falla:
     - Establecer código de respuesta 400
     - Retornar JSON con mensaje: "Email es obligatorio"
     - Terminar ejecución

3. **Validar formato del email con PatternBuilder**
   - Crear nueva instancia de `PatternBuilder`
   - Construir patrón de email:
     - Llamar `startOfLine()` para indicar inicio de línea
     - Llamar `word()` para caracteres de palabra (a-z, A-Z, 0-9, \_)
     - Llamar `oneOrMore()` para indicar uno o más caracteres
     - Llamar `find('@')` para buscar el símbolo @ LITERALMENTE
     - Llamar `word().oneOrMore()` para el dominio
     - Llamar `find('.')` para el punto (escapado automáticamente)
     - Llamar `word().oneOrMore()` para la extensión (.com, .net, etc.)
     - Llamar `endOfLine()` para indicar final de línea
   - Llamar método `matches(email)` con el email recibido
   - SI NO coincide:
     - Establecer código de respuesta 400
     - Retornar JSON con mensaje: "Formato de email inválido"
     - Terminar ejecución

4. **Generar token de recuperación**
   - Obtener variable de entorno `FRONTEND_URL` usando `process.env`
   - Construir URL de redirección: `FRONTEND_URL + '/reset-password'`
   - Iniciar bloque try-catch para manejo de errores
   - Llamar al método `resetPasswordForEmail` de `supabase.auth`
   - Pasar como parámetros:
     - Primer argumento: el email
     - Segundo argumento: objeto con propiedad `redirectTo` (la URL construida)
   - Obtener respuesta con destructuring del campo `error`
   - SI existe error:
     - Registrar error en consola con prefijo descriptivo
     - Establecer código de respuesta 500
     - Retornar JSON con mensaje: "Error al procesar solicitud"
     - Terminar ejecución

5. **Respuesta exitosa (security-first)**
   - Establecer código de respuesta 200
   - Retornar JSON con mensaje genérico
   - **IMPORTANTE:** NO revelar si el email existe o no (seguridad)
   - Mensaje sugerido: "Si el email existe, recibirás instrucciones para recuperar tu contraseña"

6. **Manejo de excepciones**
   - En el bloque catch:
     - Registrar excepción completa en consola
     - Establecer código de respuesta 500
     - Retornar JSON con mensaje: "Error interno del servidor"

---

#### ⚠️ QUÉ PUEDE SALIR MAL

**Problema 1: Email con formato válido pero no existe en Supabase**

- **Solución:** Siempre retornar 200 con mensaje genérico
- **Razón:** Prevenir enumeración de cuentas (seguridad)

**Problema 2: FRONTEND_URL no configurada o incorrecta**

- **Síntoma:** Email llega pero link redirige a 404
- **Solución:** Validar variable de entorno al iniciar el servidor
- **Prevención:** Agregar validación en archivo de configuración

**Problema 3: Supabase no envía emails**

- **Causas posibles:**
  - Email provider no configurado en Supabase dashboard
  - Template de email deshabilitado
  - Email en lista negra o spam
- **Debugging:**
  - Verificar logs de Supabase dashboard
  - Probar con email diferente
  - Revisar carpeta spam

**Problema 4: PatternBuilder acepta emails inválidos**

- **Ejemplo:** `user@domain` (sin TLD)
- **Solución:** Patrón actual require TLD (.com, .net, etc.)
- **Mejora futura:** Validar TLDs conocidos con `or()` de PatternBuilder

**Problema 5: Múltiples solicitudes del mismo email (rate limiting)**

- **Riesgo:** Flooding de emails a un usuario
- **Solución:** Implementar rate limiting por IP/email
- **Consideración:** Supabase tiene límites nativos, pero agregar capa extra

---

#### 📋 CHECKLIST DE VALIDACIÓN

- [ ] Email nulo/vacío retorna 400
- [ ] Email con formato inválido retorna 400
- [ ] Email válido retorna 200 (exista o no)
- [ ] Variable FRONTEND_URL está configurada
- [ ] URL de redirección es HTTPS en producción
- [ ] Supabase envía email correctamente
- [ ] Link en email redirige a página correcta
- [ ] Mensaje de respuesta NO revela si email existe
- [ ] Errores de Supabase se registran en logs
- [ ] Excepciones inesperadas se manejan con 500

---

#### 💡 MEJORES PRÁCTICAS

1. **Logging estructurado:**
   - Registrar intentos de recuperación (sin revelar en respuesta)
   - Incluir timestamp y email (hasheado)
   - Útil para detectar abusos

2. **Rate limiting:**
   - Máximo 3 intentos por email por hora
   - Máximo 10 intentos por IP por hora
   - Usar Redis para contadores distribuidos

3. **Email user-friendly:**
   - Template de email debe ser claro
   - Incluir tiempo de expiración del link
   - Agregar link de soporte si no solicitó

4. **Monitoreo:**
   - Alertar si tasa de error de Supabase > 10%
   - Dashboard con métricas de recuperación
   - Detectar picos anormales de solicitudes

---

### Paso 1.2: Crear Método `resetPassword`

**Ubicación:** `src/controllers/AuthController.js`

#### Algoritmo Detallado:

1. **Extraer datos del request**
   - Obtener campo `newPassword` del cuerpo de la petición
   - Almacenar en variable local

2. **Validar longitud mínima**
   - Verificar que `newPassword` no sea nulo
   - Verificar que longitud de `newPassword` sea >= 8 caracteres
   - SI NO cumple:
     - Establecer código 400
     - Retornar mensaje: "La contraseña debe tener al menos 8 caracteres"
     - Terminar ejecución

3. **Validar complejidad con PatternBuilder**

   **a) Validar mayúscula:**
   - Crear nueva instancia de `PatternBuilder`
   - Llamar `range('A', 'Z')` para definir rango de mayúsculas
   - Llamar `matches(newPassword)`
   - SI NO coincide: marcar como inválida (almacenar flag o usar variable)

   **b) Validar número:**
   - Crear nueva instancia de `PatternBuilder`
   - Llamar `digit()` para buscar dígitos
   - Llamar `matches(newPassword)`
   - SI NO coincide: marcar como inválida

   **c) Evaluar resultado:**
   - SI alguna validación falló:
     - Establecer código 400
     - Retornar mensaje: "La contraseña debe contener al menos una mayúscula y un número"
     - Terminar ejecución

4. **Actualizar contraseña en Supabase**
   - Iniciar bloque try-catch
   - Llamar método `updateUser` de `supabase.auth`
   - Pasar objeto con propiedad `password` igual a `newPassword`
   - Obtener respuesta con destructuring del campo `error`
   - SI existe error:
     - Convertir mensaje de error a minúsculas
     - Verificar si contiene la palabra "token"
     - SI contiene "token":
       - Establecer código 400
       - Retornar mensaje: "Token inválido o expirado"
     - SI NO:
       - Establecer código 500
       - Retornar mensaje: "Error al actualizar contraseña"
     - Terminar ejecución

5. **Respuesta exitosa**
   - Establecer código 200
   - Retornar JSON con mensaje: "Contraseña actualizada correctamente"

6. **Manejo de excepciones**
   - En bloque catch:
     - Registrar error en consola
     - Establecer código 500
     - Retornar mensaje genérico de error

---

### Paso 1.3: Registrar Rutas

**Ubicación:** `src/routes/AuthRoutes.js`

#### Algoritmo:

1. **Localizar archivo de rutas de autenticación**
   - Abrir `AuthRoutes.js`
   - Ubicar línea donde se importa `AuthController`

2. **Agregar ruta de forgot-password**
   - Después de las rutas existentes (login, register)
   - Registrar nueva ruta:
     - Método HTTP: POST
     - Path: `'/forgot-password'`
     - Handler: `AuthController.forgotPassword`

3. **Agregar ruta de reset-password**
   - Registrar nueva ruta:
     - Método HTTP: POST
     - Path: `'/reset-password'`
     - Handler: `AuthController.resetPassword`

---

### Paso 1.4: Configurar Variable de Entorno

**Ubicación:** `.env`

#### Pasos:

1. **Abrir archivo .env**
   - Localizar el archivo en la raíz del proyecto

2. **Agregar variable FRONTEND_URL**
   - Añadir nueva línea al final del archivo
   - Formato: `FRONTEND_URL=URL_DEL_FRONTEND`
   - Ejemplo desarrollo: `FRONTEND_URL=http://localhost:3001`
   - Ejemplo producción: `FRONTEND_URL=https://app.misitio.com`

3. **Actualizar .env.example**
   - Abrir archivo `.env.example`
   - Agregar la misma variable pero sin valor real
   - Ejemplo: `FRONTEND_URL=http://localhost:3000`
   - Agregar comentario explicativo si es necesario

---

### Testing Manual

#### Test 1: Solicitar Recuperación

**Pasos:**

1. Iniciar el servidor en puerto 3000
2. Usar herramienta HTTP (curl, Postman, Thunder Client)
3. Configurar petición:
   - Método: POST
   - URL: `http://localhost:3000/auth/forgot-password`
   - Header: `Content-Type: application/json`
   - Body: JSON con campo `email` y un email válido
4. Enviar petición
5. Verificar respuesta:
   - Código de estado debe ser 200
   - Mensaje debe ser genérico
6. Revisar bandeja de entrada del email
7. Verificar recepción de email de Supabase
8. Obtener token del link en el email

#### Test 2: Resetear Contraseña

**Pasos:**

1. Usar token obtenido del email
2. Configurar petición:
   - Método: POST
   - URL: `http://localhost:3000/auth/reset-password`
   - Header: `Content-Type: application/json`
   - Header: `Authorization: Bearer TOKEN_DEL_EMAIL`
   - Body: JSON con `newPassword` (mínimo 8 chars, 1 mayúscula, 1 número)
3. Enviar petición
4. Verificar código 200 y mensaje de éxito
5. Intentar login con la nueva contraseña
6. Confirmar que funciona correctamente

---

## TAREA 2: ACTUALIZACIÓN DE PERFIL

**Prioridad:** 🟡 MEDIA  
**Archivos a crear:** 1 nuevo

### Paso 2.1: Crear Middleware de Autenticación

**Ubicación:** `src/middlewares/authMiddleware.js` **(ARCHIVO NUEVO)**

#### Algoritmo Detallado:

1. **Importar dependencias**
   - Importar `Coherer` desde `nicola-framework`
   - Este módulo permite verificar tokens JWT firmados

2. **Definir middleware `requireAuth`**
   - Crear función que recibe tres parámetros: `req`, `res`, `next`
   - Esta función será un middleware de Express

3. **Extraer token del header**
   - Obtener header `Authorization` de `req.headers`
   - Almacenar en variable local `authHeader`
   - Verificar que `authHeader` no sea nulo o undefined
   - Verificar que `authHeader` inicie con la cadena "Bearer "
   - SI alguna condición falla:
     - Establecer código de respuesta 401 (Unauthorized)
     - Retornar JSON con mensaje: "Token no proporcionado"
     - NO llamar a `next()`
     - Terminar ejecución del middleware

4. **Separar token del prefijo**
   - Dividir `authHeader` usando el espacio como separador
   - Obtener el segundo elemento del arreglo resultante (índice 1)
   - Almacenar en variable `token`

5. **Verificar token con Coherer**
   - Iniciar bloque try-catch
   - Dentro del try:
     - Llamar método `verify` de `Coherer` pasando el `token`
     - Almacenar resultado en variable `payload`
     - Adjuntar `payload` a `req.user` (agregar propiedad al objeto request)
     - Llamar a `next()` para continuar al siguiente middleware/handler

6. **Manejo de token inválido**
   - En bloque catch:
     - Establecer código de respuesta 401
     - Retornar JSON con mensaje: "Token inválido o expirado"
     - NO llamar a `next()`

7. **Exportar middleware**
   - Exportar la función `requireAuth` para uso en rutas

---

### Paso 2.2: Crear Método `updateProfile`

**Ubicación:** `src/controllers/AuthController.js`

#### Algoritmo Detallado:

1. **Obtener ID del usuario autenticado**
   - Acceder a `req.user` (colocado por middleware requireAuth)
   - Extraer propiedad `userId` de `req.user`
   - Almacenar en variable `userId`

2. **Extraer datos a actualizar**
   - Obtener campo `firstName` del body (opcional)
   - Obtener campo `lastName` del body (opcional)
   - Almacenar en variables locales

3. **Construir objeto de actualización**
   - Crear objeto vacío `updateData`
   - SI `firstName` existe Y tiene longitud > 0:
     - Aplicar método `trim()` para eliminar espacios
     - Agregar al objeto: `updateData.first_name = firstName.trim()`
   - SI `lastName` existe Y tiene longitud > 0:
     - Aplicar `trim()`
     - Agregar al objeto: `updateData.last_name = lastName.trim()`

4. **Validar que hay datos para actualizar**
   - Obtener cantidad de propiedades de `updateData` usando `Object.keys().length`
   - SI la cantidad es 0:
     - Establecer código 400
     - Retornar mensaje: "No hay datos para actualizar"
     - Terminar ejecución

5. **Actualizar en base de datos**
   - Iniciar bloque try-catch
   - Llamar a `supabase.schema('devschema').from('profile')`
   - Encadenar método `.update(updateData)`
   - Encadenar método `.eq('id', userId)` para filtrar por ID
   - Obtener respuesta con destructuring de `error`
   - SI existe error:
     - Registrar error en consola
     - Establecer código 500
     - Retornar mensaje: "Error al actualizar perfil"
     - Terminar ejecución

6. **Obtener perfil actualizado**
   - Llamar a `supabase.schema('devschema').from('profile')`
   - Encadenar `.select('*')` para obtener todos los campos
   - Encadenar `.eq('id', userId)`
   - Encadenar `.single()` para obtener un solo registro
   - Obtener respuesta con destructuring de `data` y `error`
   - SI existe error:
     - Registrar en consola
     - Establecer código 500
     - Retornar mensaje: "Error al obtener perfil actualizado"

7. **Respuesta exitosa**
   - Establecer código 200
   - Retornar JSON con dos campos:
     - `message`: "Perfil actualizado correctamente"
     - `user`: los datos del perfil obtenidos

8. **Manejo de excepciones**
   - En catch:
     - Registrar error completo
     - Retornar código 500 con mensaje genérico

---

### Paso 2.3: Registrar Ruta Protegida

**Ubicación:** `src/routes/AuthRoutes.js`

#### Algoritmo:

1. **Importar middleware**
   - Al inicio del archivo, agregar import
   - Importar `requireAuth` desde `../middlewares/authMiddleware.js`

2. **Registrar ruta con middleware**
   - Método HTTP: PUT
   - Path: `'/profile'`
   - Middleware: `requireAuth` (PRIMERO)
   - Handler: `AuthController.updateProfile` (SEGUNDO)
   - Orden crítico: primero valida token, luego ejecuta handler

---

### Testing

#### Flujo completo:

1. **Obtener token válido**
   - Hacer login usando `POST /auth/login`
   - Extraer token de la respuesta
   - Almacenar token en variable

2. **Probar actualización exitosa**
   - Método: PUT
   - URL: `http://localhost:3000/auth/profile`
   - Header: `Authorization: Bearer TOKEN_AQUI`
   - Header: `Content-Type: application/json`
   - Body: `{ "firstName": "Nuevo", "lastName": "Nombre" }`
   - Verificar código 200
   - Verificar que respuesta incluye datos actualizados

3. **Probar sin token (debe fallar)**
   - Misma petición SIN header Authorization
   - Verificar código 401
   - Verificar mensaje "Token no proporcionado"

4. **Probar con token inválido (debe fallar)**
   - Header: `Authorization: Bearer TOKEN_INVENTADO`
   - Verificar código 401
   - Verificar mensaje "Token inválido o expirado"

5. **Probar sin datos (debe fallar)**
   - Header válido pero body vacío `{}`
   - Verificar código 400
   - Verificar mensaje "No hay datos para actualizar"

---

## TAREA 3: SISTEMA DE ROLES Y PERMISOS

**Prioridad:** 🔴 ALTA  
**Archivos a crear:** 1 nuevo  
**Archivos a modificar:** múltiples rutas

### Paso 3.1: Crear Middleware de Roles

**Ubicación:** `src/middlewares/roleMiddleware.js` **(ARCHIVO NUEVO)**

#### Algoritmo Detallado:

1. **Importar dependencias**
   - Importar `supabase` desde `../services/SupabaseClient.js`

2. **Definir función generadora `requireRole`**
   - Crear función que recibe UN parámetro: `allowedRoles` (array de strings)
   - Esta función RETORNA otra función (closure)
   - La función retornada es el middleware real

3. **Función middleware interna**
   - Definir función que recibe: `req`, `res`, `next`
   - Esta es asíncrona (usa async/await)

4. **Verificar autenticación previa**
   - Verificar que `req.user` existe
   - SI NO existe:
     - Establecer código 401
     - Retornar mensaje: "No autenticado"
     - Terminar ejecución

5. **Obtener ID del usuario**
   - Extraer `userId` de `req.user`
   - Almacenar en variable local

6. **Consultar rol del usuario**
   - Iniciar bloque try-catch
   - Llamar a `supabase.schema('devschema').from('profile')`
   - Encadenar `.select('role')` para obtener solo el campo rol
   - Encadenar `.eq('id', userId)`
   - Encadenar `.single()`
   - Obtener respuesta con destructuring de `data` y `error` (nombrar data como `profile`)
   - SI existe error O NO existe profile:
     - Registrar error en consola
     - Establecer código 500
     - Retornar mensaje: "Error al verificar permisos"
     - Terminar ejecución

7. **Validar permisos**
   - Obtener el rol del usuario: `profile.role`
   - Verificar si el rol está incluido en el array `allowedRoles`
   - Usar método `.includes()` del array
   - SI NO está incluido:
     - Establecer código 403 (Forbidden)
     - Retornar JSON con tres campos:
       - `error`: "No tienes permisos para realizar esta acción"
       - `requiredRoles`: el array de roles permitidos
       - `yourRole`: el rol actual del usuario
     - Terminar ejecución

8. **Autorización exitosa**
   - Adjuntar rol a request: `req.userRole = profile.role`
   - Llamar a `next()` para continuar

9. **Manejo de excepciones**
   - En catch:
     - Registrar error completo
     - Establecer código 500
     - Retornar mensaje genérico

10. **Exportar función**
    - Exportar `requireRole` como función generadora

---

### Paso 3.2: Aplicar Middleware a Rutas Sensibles

**Ubicación:** Múltiples archivos de rutas

#### Para `src/routes/chatRoutes.js`:

1. **Importar middlewares**
   - Importar `requireAuth` desde `../middlewares/authMiddleware.js`
   - Importar `requireRole` desde `../middlewares/roleMiddleware.js`

2. **Proteger ruta de chat**
   - Localizar registro de ruta `/chat`
   - Modificar para PRIMERO pasar por `requireAuth`
   - Luego pasar por `requireRole(['user', 'admin'])`
   - Finalmente llegar al handler `handleChat`
   - Orden: autenticación → autorización → lógica

3. **Proteger ruta de creación de campaña (solo admin)**
   - Localizar ruta `/createCampaing`
   - Aplicar `requireAuth` primero
   - Aplicar `requireRole(['admin'])` segundo
   - Handler al final

#### Para otras rutas:

**Identificar rutas sensibles:**

- Rutas que modifican datos importantes
- Rutas administrativas
- Rutas de generación de contenido costoso

**Criterios para aplicar roles:**

- `['admin']` solo para: eliminación, cambio de estados críticos
- `['user', 'admin']` para: operaciones normales del sistema
- `['moderator', 'admin']` para: revisión de contenido

---

### Paso 3.3: Crear Endpoint de Gestión de Roles

**Ubicación:** `src/controllers/AuthController.js`

#### Algoritmo Detallado:

1. **Definir método estático `changeUserRole`**
   - Recibe parámetros estándar: `req`, `res`

2. **Extraer datos del request**
   - Obtener `targetUserId` del body (ID del usuario a modificar)
   - Obtener `newRole` del body (nuevo rol a asignar)
   - Almacenar en variables locales

3. **Definir roles válidos**
   - Crear array constante: `['user', 'admin', 'moderator']`
   - Almacenar en variable `validRoles`

4. **Validar rol proporcionado**
   - Verificar si `newRole` está incluido en `validRoles`
   - SI NO está incluido:
     - Establecer código 400
     - Retornar JSON con dos campos:
       - `error`: "Rol inválido"
       - `validRoles`: el array de roles válidos
     - Terminar ejecución

5. **Prevenir auto-modificación**
   - Comparar `targetUserId` con `req.user.userId`
   - SI son iguales:
     - Establecer código 400
     - Retornar mensaje: "No puedes cambiar tu propio rol"
     - Term inar ejecución

6. **Actualizar rol en base de datos**
   - Iniciar try-catch
   - Llamar a `supabase.schema('devschema').from('profile')`
   - Encadenar `.update({ role: newRole })`
   - Encadenar `.eq('id', targetUserId)`
   - Obtener destructuring de `error`
   - SI existe error:
     - Registrar en consola
     - Establecer código 500
     - Retornar mensaje: "Error al actualizar rol"

7. **Respuesta exitosa**
   - Establecer código 200
   - Retornar JSON con tres campos:
     - `message`: "Rol actualizado correctamente"
     - `targetUserId`: el ID del usuario modificado
     - `newRole`: el nuevo rol asignado

8. **Manejo de excepciones**
   - En catch: código 500 con mensaje genérico

---

### Paso 3.4: Registrar Ruta de Gestión

**Ubicación:** `src/routes/AuthRoutes.js`

#### Algoritmo:

1. **Importar middlewares necesarios**
   - Verificar que ya estén importados `requireAuth` y `requireRole`

2. **Registrar ruta de cambio de rol**
   - Método HTTP: PATCH (o PUT)
   - Path: `'/users/:id/role'`
   - Middleware 1: `requireAuth`
   - Middleware 2: `requireRole(['admin'])` - SOLO ADMINS
   - Handler: `AuthController.changeUserRole`

---

### Testing del Sistema de Roles

#### Test 1: Usuario Normal Accede a Ruta Admin (DEBE FALLAR)

1. Hacer login como usuario con rol 'user'
2. Extraer token
3. Intentar crear campaña:
   - POST `/ai/createCampaing`
   - Header: `Authorization: Bearer TOKEN_USER`
4. Verificar código 403
5. Verificar mensaje incluye roles requeridos y rol actual

#### Test 2: Admin Accede a Ruta Admin (DEBE FUNCIONAR)

1. Login como usuario con rol 'admin'
2. Extraer token
3. Crear campaña con token de admin
4. Verificar código 200 o 201
5. Verificar que operación se completó

#### Test 3: Usuario Intenta Cambiar Su Propio Rol (DEBE FALLAR)

1. Login como cualquier usuario
2. Obtener su propio ID del perfil
3. Intentar cambiar su rol:
   - PATCH `/auth/users/SU_PROPIO_ID/role`
   - Body: `{ "newRole": "admin" }`
4. Verificar código 400
5. Verificar mensaje: "No puedes cambiar tu propio rol"

#### Test 4: Admin Cambia Rol de Otro Usuario (DEBE FUNCIONAR)

1. Login como admin
2. Obtener ID de otro usuario (usuario objetivo)
3. Cambiar rol:
   - PATCH `/auth/users/ID_OBJETIVO/role`
   - Body: `{ "newRole": "moderator" }`
4. Verificar código 200
5. Verificar respuesta incluye ID y nuevo rol
6. Confirmar cambio haciendo login como usuario objetivo
7. Verificar que tiene permisos de moderador

---

## ORDEN SUGERIDO DE IMPLEMENTACIÓN

### Secuencia Óptima:

1. **DÍA 1:** TAREA 2 - Middleware + Update Profile
   - Razón: El middleware de autenticación es prerequisito para el sistema de roles
   - Crear `authMiddleware.js`
   - Implementar `updateProfile`
   - Testing básico

2. **DÍA 2:** TAREA 1 - Password Recovery
   - Razón: Funcionalidad independiente, puede hacerse en paralelo al conocimiento del middleware
   - Implementar `forgotPassword`
   - Implementar `resetPassword`
   - Configurar variables de entorno
   - Testing con email real

3. **DÍA 3-4:** TAREA 3 - Sistema de Roles
   - Razón: Requiere el middleware ya implementado (Tarea 2)
   - Crear `roleMiddleware.js`
   - Aplicar a rutas existentes
   - Crear gestión de roles (admin only)
   - Testing exhaustivo de permisos

---

## CHECKLIST DE VALIDACIÓN

### Antes de Considerar Completo:

#### Tarea 1:

- [ ] Email se valida con PatternBuilder
- [ ] Supabase envía emails correctamente
- [ ] Reset funciona con token del email
- [ ] Contraseña se valida: mínimo 8, 1 mayúscula, 1 número
- [ ] Errores de token inválido se manejan correctamente
- [ ] No se revela si un email existe o no

#### Tarea 2:

- [ ] Middleware requireAuth rechaza peticiones sin token
- [ ] Middleware requieAuth rechaza tokens inválidos
- [ ] Tokens válidos permiten acceso
- [ ] UpdateProfile actualiza correctamente
- [ ] UpdateProfile rechaza body vacío
- [ ] Respuesta incluye datos actualizados

#### Tarea 3:

- [ ] requireRole funciona con múltiples roles
- [ ] Usuario sin permisos recibe 403
- [ ] Admin puede cambiar roles de otros
- [ ] Usuario NO puede cambiar su propio rol
- [ ] Roles inválidos son rechazados
- [ ] Todas las rutas sensibles están protegidas

---

## NOTAS IMPORTANTES

### Seguridad:

1. **Nunca revelar información sensible en errores**
   - NO decir "email no existe"
   - NO decir "contraseña incorrecta"
   - Usar mensajes genéricos

2. **Validar en servidor SIEMPRE**
   - No confiar en validación de frontend
   - PatternBuilder hace validación robusta
   - Verificar permisos en cada request

3. **Tokens deben expirar**
   - JWT tiene expiración de 1h (configurado en login)
   - Tokens de reset de Supabase expiran automáticamente

### PatternBuilder Trade-offs:

**Ventajas:**

- Escaping automático (seguro)
- API legible y mantenible
- Debugging sencillo con `.debug()`

**Limitaciones conocidas:**

- Patrones muy complejos pueden ser verbosos
- Para validaciones simples, a veces regex nativa es más corta

**Cuándo usar PatternBuilder:**

- Validación de emails ✅
- Validación de contraseñas ✅
- Extracción de datos estructurados ✅
- Patterns que cambiarán frecuentemente ✅

**Cuándo NO usarlo:**

- Patterns de una sola línea muy simples
- Performance crítica (aunque la diferencia es mínima)

---

## TROUBLESHOOTING COMÚN

### Problema: "Token no proporcionado" aunque lo envío

**Causa:** Header mal formado
**Solución:**

- Verificar que header se llama `Authorization` (con z y mayúscula A)
- Verificar formato exacto: `Bearer TOKEN` (con espacio)
- No incluir comillas en el token

### Problema: Email no llega de Supabase

**Causa:** Configuración de Supabase incompleta
**Solución:**

- Verificar configuración de Auth en dashboard de Supabase
- Confirmar que Email Provider está habilitado
- Revisar templates de email
- Verificar que FRONTEND_URL sea accesible

### Problema: "Error al verificar permisos" constantemente

**Causa:** Tabla profile no tiene el campo role
**Solución:**

- Verificar que tabla `devschema.profile` existe
- Confirmar que columna `role` existe
- Verificar que registros tienen rol asignado (default: 'user')

---

**Fin del Documento**
 
 