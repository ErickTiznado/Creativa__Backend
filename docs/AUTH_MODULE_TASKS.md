# MÓDULO AUTH - PLAN DE IMPLEMENTACIÓN

## Tareas Faltantes en Pasos Algorítmicos Detallados

**Fecha:** 17 de Enero 2026  
**Módulo:** Auth & Usuarios  
**Estado Actual:** 2/5 implementado (40%)  
**Funcionalidades Faltantes:** 3

---

## TAREA 1: RECUPERACIÓN DE CONTRASEÑA

**Prioridad:** 🔴 ALTA  
**Tiempo Estimado:** 2-3 días  
**Archivos a Crear/Modificar:** 2 archivos

### Paso 1.1: Crear Endpoint de Solicitud de Recuperación

**Archivo:** `src/controllers/AuthController.js`

```javascript
// ALGORITMO: forgotPassword
// INPUT: email (string)
// OUTPUT: { message: "Email enviado" } | { error: "..." }

PASO 1: Validar entrada
  1.1 Extraer email del req.body
  1.2 SI email es null O vacío ENTONCES
        RETORNAR error 400 "Email es obligatorio"
  1.3 Validar formato de email (regex)

PASO 2: Verificar usuario existe
  2.1 Consultar Supabase: SELECT id FROM auth.users WHERE email = ?
  2.2 SI usuario NO existe ENTONCES
        RETORNAR 200 (no revelar si existe o no por seguridad)

PASO 3: Generar token de recuperación
  3.1 Llamar a supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${FRONTEND_URL}/reset-password`
      })
  3.2 SI error ENTONCES
        LOG error
        RETORNAR error 500

PASO 4: Respuesta exitosa
  4.1 RETORNAR 200 {
        message: "Si el email existe, recibirás instrucciones"
      }
```

**Código Implementación:**

```javascript
static async forgotPassword(req, res) {
  const { email } = req.body;

  // Paso 1: Validación
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.statusCode = 400;
    return res.json({ error: "Email válido es obligatorio" });
  }

  try {
    // Paso 3: Generar token
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      console.error("Error reset password:", error);
      res.statusCode = 500;
      return res.json({ error: "Error al procesar solicitud" });
    }

    // Paso 4: Respuesta (siempre exitosa por seguridad)
    res.statusCode = 200;
    res.json({
      message: "Si el email existe, recibirás instrucciones para recuperar tu contraseña"
    });

  } catch (err) {
    console.error("Error crítico:", err);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
}
```

### Paso 1.2: Crear Endpoint de Reseteo de Contraseña

**Algoritmo:**

```javascript
// ALGORITMO: resetPassword
// INPUT: token (string), newPassword (string)
// OUTPUT: { message: "Contraseña actualizada" } | { error: "..." }

PASO 1: Validar entrada
  1.1 Extraer token, newPassword del req.body
  1.2 Validar newPassword:
      - Longitud >= 8 caracteres
      - Contiene al menos 1 mayúscula
      - Contiene al menos 1 número

PASO 2: Actualizar contraseña
  2.1 Llamar supabase.auth.updateUser({ password: newPassword })
  2.2 SI error ENTONCES
        SI error.message contiene "token" ENTONCES
          RETORNAR error 400 "Token inválido o expirado"
        SINO
          RETORNAR error 500

PASO 3: Respuesta exitosa
  3.1 RETORNAR 200 { message: "Contraseña actualizada correctamente" }
```

**Código:**

```javascript
static async resetPassword(req, res) {
  const { newPassword } = req.body;

  // Validación de contraseña
  if (!newPassword || newPassword.length < 8) {
    res.statusCode = 400;
    return res.json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    res.statusCode = 400;
    return res.json({
      error: "La contraseña debe contener al menos una mayúscula y un número"
    });
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      if (error.message.toLowerCase().includes('token')) {
        res.statusCode = 400;
        return res.json({ error: "Token inválido o expirado" });
      }
      res.statusCode = 500;
      return res.json({ error: "Error al actualizar contraseña" });
    }

    res.statusCode = 200;
    res.json({ message: "Contraseña actualizada correctamente" });

  } catch (err) {
    console.error("Error crítico:", err);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
}
```

### Paso 1.3: Registrar Rutas

**Archivo:** `src/routes/AuthRoutes.js`

```javascript
// Agregar después de las rutas existentes:
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
```

### Paso 1.4: Configurar Variables de Entorno

**Archivo:** `.env`

```bash
FRONTEND_URL=http://localhost:3001
```

### Paso 1.5: Testing Manual

```bash
# Test 1: Solicitar recuperación
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test 2: Resetear contraseña (requiere token del email)
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NuevaPass123"}'
```

---

## TAREA 2: ACTUALIZACIÓN DE PERFIL

**Prioridad:** 🟡 MEDIA  
**Tiempo Estimado:** 1-2 días  
**Archivos a Crear/Modificar:** 3 archivos

### Paso 2.1: Crear Middleware de Autenticación

**Archivo:** `src/middlewares/authMiddleware.js` (NUEVO)

```javascript
// ALGORITMO: requireAuth
// INPUT: req (request con header Authorization)
// OUTPUT: req.user (objeto usuario) | error 401

PASO 1: Extraer token
  1.1 Obtener header Authorization
  1.2 SI header NO existe ENTONCES
        RETORNAR error 401 "Token no proporcionado"
  1.3 Extraer token (formato: "Bearer TOKEN")

PASO 2: Verificar token
  2.1 Llamar Coherer.verify(token)
  2.2 SI token inválido O expirado ENTONCES
        RETORNAR error 401 "Token inválido o expirado"

PASO 3: Adjuntar usuario a request
  3.1 req.user = payload decodificado
  3.2 Llamar next()
```

**Código:**

```javascript
import { Coherer } from "nicola-framework";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.statusCode = 401;
    return res.json({ error: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = Coherer.verify(token);
    req.user = payload;
    next();
  } catch (err) {
    res.statusCode = 401;
    res.json({ error: "Token inválido o expirado" });
  }
};
```

### Paso 2.2: Crear Endpoint de Actualización

**Archivo:** `src/controllers/AuthController.js`

```javascript
// ALGORITMO: updateProfile
// INPUT: firstName, lastName (opcionales)
// OUTPUT: { message: "Perfil actualizado", user: {...} }

PASO 1: Validar autenticación
  1.1 Obtener userId de req.user.userId
  1.2 SI no existe ENTONCES error 401

PASO 2: Validar campos a actualizar
  2.1 Extraer firstName, lastName del req.body
  2.2 Crear objeto updateData = {}
  2.3 SI firstName existe Y longitud > 0 ENTONCES
        updateData.first_name = firstName
  2.4 SI lastName existe Y longitud > 0 ENTONCES
        updateData.last_name = lastName
  2.5 SI updateData está vacío ENTONCES
        RETORNAR error 400 "No hay datos para actualizar"

PASO 3: Actualizar en base de datos
  3.1 UPDATE devschema.profile SET updateData WHERE id = userId
  3.2 SI error ENTONCES
        LOG error
        RETORNAR error 500

PASO 4: Obtener perfil actualizado
  4.1 SELECT * FROM devschema.profile WHERE id = userId
  4.2 RETORNAR 200 con perfil actualizado
```

**Código:**

```javascript
static async updateProfile(req, res) {
  const userId = req.user.userId;
  const { firstName, lastName } = req.body;

  const updateData = {};
  if (firstName && firstName.trim().length > 0) {
    updateData.first_name = firstName.trim();
  }
  if (lastName && lastName.trim().length > 0) {
    updateData.last_name = lastName.trim();
  }

  if (Object.keys(updateData).length === 0) {
    res.statusCode = 400;
    return res.json({ error: "No hay datos para actualizar" });
  }

  try {
    const { error: updateError } = await supabase
      .schema('devschema')
      .from('profile')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error("Error actualizando perfil:", updateError);
      res.statusCode = 500;
      return res.json({ error: "Error al actualizar perfil" });
    }

    const { data: profile, error: fetchError } = await supabase
      .schema('devschema')
      .from('profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error("Error obteniendo perfil:", fetchError);
      res.statusCode = 500;
      return res.json({ error: "Error al obtener perfil actualizado" });
    }

    res.statusCode = 200;
    res.json({
      message: "Perfil actualizado correctamente",
      user: profile
    });

  } catch (err) {
    console.error("Error crítico:", err);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
}
```

### Paso 2.3: Registrar Ruta Protegida

**Archivo:** `src/routes/AuthRoutes.js`

```javascript
import { requireAuth } from "../middlewares/authMiddleware.js";

// Agregar ruta protegida:
router.put("/profile", requireAuth, AuthController.updateProfile);
```

### Paso 2.4: Testing

```bash
# Primero hacer login para obtener token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# Actualizar perfil
curl -X PUT http://localhost:3000/auth/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"firstName":"Juan","lastName":"Pérez"}'
```

---

## TAREA 3: SISTEMA DE ROLES Y PERMISOS

**Prioridad:** 🔴 ALTA  
**Tiempo Estimado:** 3-4 días  
**Archivos a Crear/Modificar:** 4 archivos

### Paso 3.1: Crear Middleware de Roles

**Archivo:** `src/middlewares/roleMiddleware.js` (NUEVO)

```javascript
// ALGORITMO: requireRole
// INPUT: allowedRoles (array de strings)
// OUTPUT: función middleware

FUNCIÓN requireRole(allowedRoles):
  RETORNAR MIDDLEWARE(req, res, next):
    PASO 1: Verificar autenticación previa
      1.1 SI req.user NO existe ENTONCES
            RETORNAR error 401 "No autenticado"

    PASO 2: Obtener rol del usuario
      2.1 userId = req.user.userId
      2.2 CONSULTAR perfil: SELECT role FROM profile WHERE id = userId
      2.3 SI error O no existe perfil ENTONCES
            RETORNAR error 500

    PASO 3: Validar permisos
      3.1 SI userRole NO está en allowedRoles ENTONCES
            RETORNAR error 403 "No tienes permisos para esta acción"

    PASO 4: Continuar
      4.1 req.userRole = userRole
      4.2 Llamar next()
```

**Código:**

```javascript
import { supabase } from "../services/SupabaseClient.js";

export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      res.statusCode = 401;
      return res.json({ error: "No autenticado" });
    }

    const userId = req.user.userId;

    try {
      const { data: profile, error } = await supabase
        .schema("devschema")
        .from("profile")
        .select("role")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        console.error("Error obteniendo rol:", error);
        res.statusCode = 500;
        return res.json({ error: "Error al verificar permisos" });
      }

      if (!allowedRoles.includes(profile.role)) {
        res.statusCode = 403;
        return res.json({
          error: "No tienes permisos para realizar esta acción",
          requiredRoles: allowedRoles,
          yourRole: profile.role,
        });
      }

      req.userRole = profile.role;
      next();
    } catch (err) {
      console.error("Error crítico en requireRole:", err);
      res.statusCode = 500;
      res.json({ error: "Error interno del servidor" });
    }
  };
};
```

### Paso 3.2: Aplicar a Rutas Sensibles

**Ejemplo en `src/routes/chatRoutes.js`:**

```javascript
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";

// Rutas protegidas por rol
router.post(
  "/chat",
  requireAuth, // Primero verificar autenticación
  requireRole(["user", "admin"]), // Luego verificar rol
  handleChat,
);

router.post(
  "/createCampaing",
  requireAuth,
  requireRole(["admin"]), // Solo admins pueden crear campañas
  brief_DB.Create_Campaing,
);
```

### Paso 3.3: Crear Endpoint para Gestión de Roles (Admin)

**Archivo:** `src/controllers/AuthController.js`

```javascript
// ALGORITMO: changeUserRole (Solo Admin)
// INPUT: targetUserId, newRole
// OUTPUT: { message: "Rol actualizado" }

PASO 1: Validar es admin
  1.1 SI req.userRole !== 'admin' ENTONCES
        RETORNAR error 403

PASO 2: Validar entrada
  2.1 Extraer targetUserId, newRole
  2.2 Validar newRole en ['user', 'admin', 'moderator']

PASO 3: Prevenir auto-modificación
  3.1 SI targetUserId === req.user.userId ENTONCES
        RETORNAR error 400 "No puedes cambiar tu propio rol"

PASO 4: Actualizar rol
  4.1 UPDATE profile SET role = newRole WHERE id = targetUserId
  4.2 RETORNAR 200
```

**Código:**

```javascript
static async changeUserRole(req, res) {
  const { targetUserId, newRole } = req.body;
  const validRoles = ['user', 'admin', 'moderator'];

  if (!validRoles.includes(newRole)) {
    res.statusCode = 400;
    return res.json({
      error: "Rol inválido",
      validRoles: validRoles
    });
  }

  if (targetUserId === req.user.userId) {
    res.statusCode = 400;
    return res.json({ error: "No puedes cambiar tu propio rol" });
  }

  try {
    const { error } = await supabase
      .schema('devschema')
      .from('profile')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (error) {
      console.error("Error actualizando rol:", error);
      res.statusCode = 500;
      return res.json({ error: "Error al actualizar rol" });
    }

    res.statusCode = 200;
    res.json({
      message: "Rol actualizado correctamente",
      targetUserId,
      newRole
    });

  } catch (err) {
    console.error("Error crítico:", err);
    res.statusCode = 500;
    res.json({ error: "Error interno del servidor" });
  }
}
```

### Paso 3.4: Registrar Ruta de Gestión

**Archivo:** `src/routes/AuthRoutes.js`

```javascript
router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole(["admin"]),
  AuthController.changeUserRole,
);
```

### Paso 3.5: Testing del Sistema de Roles

```bash
# Como usuario normal (debería fallar)
curl -X POST http://localhost:3000/ai/createCampaing \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123"}'

# Como admin (debería funcionar)
curl -X POST http://localhost:3000/ai/createCampaing \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"123"}'
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### Tarea 1: Recuperación de Contraseña

- [ ] Agregar método `forgotPassword` en AuthController
- [ ] Agregar método `resetPassword` en AuthController
- [ ] Registrar rutas POST `/auth/forgot-password` y `/auth/reset-password`
- [ ] Configurar `FRONTEND_URL` en .env
- [ ] Testing manual con curl
- [ ] Verificar email de Supabase se recibe

### Tarea 2: Actualización de Perfil

- [ ] Crear archivo `src/middlewares/authMiddleware.js`
- [ ] Implementar middleware `requireAuth`
- [ ] Agregar método `updateProfile` en AuthController
- [ ] Registrar ruta PUT `/auth/profile` con middleware
- [ ] Testing con token válido
- [ ] Testing con token inválido (debe retornar 401)

### Tarea 3: Sistema de Roles

- [ ] Crear archivo `src/middlewares/roleMiddleware.js`
- [ ] Implementar función `requireRole`
- [ ] Aplicar `requireAuth` + `requireRole` a rutas sensibles
- [ ] Agregar método `changeUserRole` en AuthController
- [ ] Registrar ruta PATCH `/auth/users/:id/role`
- [ ] Testing: usuario sin permisos (debe retornar 403)
- [ ] Testing: admin cambiando roles (debe funcionar)
- [ ] Testing: usuario intentando cambiar su propio rol (debe fallar)

---

## ORDEN SUGERIDO DE IMPLEMENTACIÓN

**DÍA 1:** Tarea 2 (Middleware + Update Profile)  
**DÍA 2:** Tarea 1 (Password Recovery)  
**DÍA 3-4:** Tarea 3 (Sistema de Roles)

**Razón:** El middleware de autenticación (Tarea 2) es prerrequisito para el sistema de roles (Tarea 3).

---

## TESTS ADICIONALES RECOMENDADOS

Crear archivo `src/test/auth.test.js` con casos de prueba:

```javascript
// Casos de prueba críticos:
1. Login exitoso retorna token válido
2. Token expirado retorna 401
3. Token con firma incorrecta retorna 401
4. Update profile sin autenticación retorna 401
5. Update profile con token válido actualiza datos
6. Usuario con rol 'user' no puede acceder a ruta admin
7. Usuario con rol 'admin' puede acceder a ruta admin
8. Admin no puede cambiar su propio rol
9. Forgot password con email inexistente no revela información
10. Reset password con token inválido retorna error
```

---

**FIN DEL DOCUMENTO**
