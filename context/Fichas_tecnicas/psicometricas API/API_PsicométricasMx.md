---
title: "API PsicométricasMx"
description: "Documentación REST para integración con Psicométricas"
version: "2023"
---

# 🧩 API – PsicométricasMx

## Introducción
El API de Psicométricas está diseñado sobre **REST**, por lo tanto las URL están orientadas a recursos y usan **códigos de respuesta HTTP** para indicar errores.  
Todas las respuestas están en formato **JSON**, incluidos los errores.

---

## 🌐 URI Base
```
https://admin.psicometricas.mx/api/
```

Usa las credenciales generadas al registrarte para autenticar tus solicitudes.

---

## 🔐 Autenticación
Todas las peticiones deben incluir:
- **Token**: clave de acceso (string, 20 caracteres)
- **Password**: contraseña (string, 20 caracteres)
- Todas las peticiones deben realizarse vía **HTTPS**.

---

## 🔧 Endpoints Principales

### 1️⃣ Agregar una Batería
**Método:** `POST`  
**URL:** `/agregaBateria`

| Parámetro | Tipo | Descripción |
|------------|------|-------------|
| Token | string | Requerido |
| Password | string | Requerido |
| Battery | string | Nombre de la batería |
| Tests | string | IDs de pruebas separados por comas (ej. 1,2,3) |

**Ejemplo:**
```json
POST https://admin.psicometricas.mx/api/agregaBateria
Token=XXXX
Password=XXXX
Battery=Evaluación Inicial
Tests=1,2,3
```

**Respuesta:**
```json
{
  "status": "200",
  "clave": "1-EUPQ-0116-1649",
  "msg": "Batería agregada correctamente."
}
```

**Listado de Pruebas:**
| ID | Nombre |
|----|---------|
| 1 | Cleaver |
| 2 | Kostick |
| 3 | IPV |
| 4 | LIFO |
| 5 | Zavic |
| 6 | Gordon |
| 7 | Terman |
| 8 | Raven |
| 9 | Inglés |
| 10 | 16PF |
| 11 | Barsit |
| 15 | Moss |
| 16 | Wonderlic |

---

### 2️⃣ Actualizar una Batería
**Método:** `PUT`  
**URL:** `/actualizaBateria/{ClaveBateria}`

Mismos parámetros que *Agregar*, con opción de dejar vacío `Battery` para conservar el nombre actual.

**Respuesta:**
```json
{
  "status": "200",
  "msg": "Batería modificada correctamente."
}
```

---

### 3️⃣ Consultar Listado de Baterías
**Método:** `GET`  
**URL:** `/consultaBateria`

**Parámetros:**
- Token  
- Password  

**Respuesta:**
```json
[
  {"clave":"1-IFCE-1019-1XXX","nombre":"Nuevo ingreso","fecha":"2020-10-19 14:46:12"},
  {"clave":"1-RRTS-0919-2XXX","nombre":"Ejemplo","fecha":"2020-10-19 14:46:12"}
]
```

---

### 4️⃣ Consultar una Batería
**Método:** `GET`  
**URL:** `/consultaBateria`

**Parámetros:**
- Token  
- Password  
- Clave (de batería)

**Respuesta:**
```json
[
  {"num_prueba":"1","nombre_prueba":"Cleaver","nombre":"Nuevo Ingreso","clave":"1-IFCE-1019-1XXX","estatus":"1"},
  {"num_prueba":"2","nombre_prueba":"Kostick","nombre":"Nuevo Ingreso","clave":"1-IFCE-1019-1XXX","estatus":"1"}
]
```

---

### 5️⃣ Agregar un Candidato
**Método:** `POST`  
**URL:** `/agregaCandidato`

| Parámetro | Tipo | Descripción |
|------------|------|-------------|
| Token | string | Requerido |
| Password | string | Requerido |
| Candidate | string | Nombre del candidato |
| Email | string | Correo electrónico |
| Vacancy | string | Vacante |
| Tests | string | IDs de pruebas |
| Lang | string | Opcional (`Mx` o `Es`) |

**Respuesta:**
```json
{
  "status": "200",
  "clave": "1-EUPQ-0116-1649",
  "msg": "Candidato agregado correctamente."
}
```

---

### 6️⃣ Actualizar Pruebas de un Candidato
**Método:** `PUT`  
**URL:** `/actualizaCandidato`

Mismos parámetros, con `Clave` del candidato.

---

### 7️⃣ Consultar un Candidato
**Método:** `GET`  
**URL:** `/consultaCandidato`

**Parámetros:**
- Token  
- Password  
- Clave  

**Respuesta:**
```json
{
  "clave":"1-GABF-0110-2220",
  "nombre":"Nombre del candidato",
  "correo_ele":"correo1@correo.com",
  "vacante":"sistemas",
  "fecha":"2020-01-10 16:20:15",
  "id_prueba":2,
  "nombre_prueba":"Kostick",
  "estatus":2
}
```

---

### 8️⃣ Consultar Listado de Candidatos
**Método:** `GET`  
**URL:** `/consultaCandidato`

**Respuesta:**
```json
[
  {"clave":"1-GABF-0110-2220","nombre":"Nombre","correo_ele":"correo1@correo.com","vacante":"sistemas","estatus":1},
  {"clave":"1-VCFS-0110-2225","nombre":"Nombre","correo_ele":"correo2@correo.com","vacante":"Test","estatus":1}
]
```

---

### 9️⃣ Consultar Resultados
**Método:** `GET`  
**URL:** `/consultaResultado`

| Parámetro | Tipo | Descripción |
|------------|------|-------------|
| Token | string | Requerido |
| Password | string | Requerido |
| Clave | string | Clave del candidato |
| Pdf | boolean | `true` → PDF, `false` → JSON |

**Respuesta:**  
- PDF → archivo binario  
- JSON → resultados en texto estructurado  

---

### 🔟 Consultar Resultado de una Prueba Específica
Agrega el parámetro adicional `Prueba` (número).  
Ejemplo: `Prueba=1`.

---

## 🪝 WebHooks

Los **webhooks** permiten recibir notificaciones cuando el candidato:
- Termina una práctica (`type: termina_practica`)
- Termina una prueba (`type: termina_prueba`)

**Ejemplo (práctica):**
```json
{
  "clave":"1-HOHD-0406-0101",
  "practica":true,
  "prueba":"1",
  "nombre_prueba":"Cleaver",
  "type":"termina_practica",
  "nombre_candidato":"Juan Rivera",
  "correo_candidato":"sistemas@psicometricas.mx",
  "profesion_candidato":"AUX: DE SISTEMAS"
}
```

**Ejemplo (prueba):**
```json
{
  "clave":"1-HOHD-0406-0101",
  "practica":false,
  "prueba":"1",
  "type":"termina_prueba"
}
```

---

## ⚠️ Errores Comunes

| Código | HTTP | Causa |
|---------|------|--------|
| 1001 | 401 | Token o contraseña incorrectos |
| 1002 | 402 | Sin paquete activo |
| 1003 | 409 | Paquete no compatible con API |
| 1004 | 422 | Faltan valores obligatorios |

---

### 🧩 Tip para CODEX
Puedes dividir esta documentación en secciones (`api/psicometricas_baterias.md`, `api/psicometricas_candidatos.md`, etc.) para que **CODEX CLI** y **Gemini Agent** las indexen más rápido y generen adaptadores automáticos (por ejemplo, `api_client.py` o `psicometrica_service.js`).
