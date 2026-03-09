# 📋 ABSTRACTO DE FUNCIONALIDADES PENDIENTES

**Fecha:** 9 de marzo de 2026  
**Basado en:** Reuniones del 3 de marzo 2026 (Sinergia RH + CALIDAD EMPRESARIAL)  
**Carpetas analizadas:** `/context/reunion/` + `/context/armado/`  

---

## 🎯 CONTEXTO

Análisis de dos reuniones con el equipo de **CALIDAD EMPRESARIAL** (cliente de Sinergia RH) para identificar cuellos de botella y necesidades de automatización que reduzcan la carga laboral y mejoren la eficiencia.

**Problema Principal:** CALIDAD EMPRESARIAL trabaja 13-15 horas diarias (8:00 a las 23:00-24:00) respondiendo WhatsApp de clientes sobre candidatos.

---

## 📊 LISTADO DE FUNCIONALIDADES PENDIENTES

### 🔴 CRÍTICAS (Alto impacto, bloqueantes)

#### 1. **Formulario Web para Alta de Candidatos**
**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 6-8 horas  
**Responsable:** Frank Saavedra  

```
REQUISITO:
- Form web en reemplazo de WhatsApp para solicitud de candidatos
- Campos: Nombre, Puesto, Ciudad, Teléfono, CV (upload)
- Checkbox: "¿Visitará candidato si viable?"
- Submit → Crea automáticamente candidato en sistema

BENEFICIO:
- Formalicia proceso
- Evita pérdida de solicitudes
- Registro automático (sin intermediarios)
- Reduce carga WhatsApp de CALIDAD EMPRESARIAL

FLUJO ACTUAL:
Cliente WhatsApp → CALIDAD EMPRESARIAL → Grupo WhatsApp → Leida/Paola
FLUJO NUEVO:
Cliente Form Web → Automático a sistema → Cola de procesos
```

---

#### 2. **Automatización de Notificaciones WhatsApp a Clientes**
**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 8-10 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Envío automático de mensajes WhatsApp a clientes en 3 momentos clave:

1. CANDIDATO CREADO EN SISTEMA
   - Trigger: Al registrar candidato manual o desde form web
   - Delay: 1-2 horas después
   - Mensaje: "Le informamos que [Candidato] ya inició su proceso"
   - Objetivo: Tranquilizar cliente, comprar tiempo

2. PROCESO ASIGNADO (Entrevistado)
   - Trigger: Cambio de estatus a "Entrevistado"
   - Delay: Inmediato
   - Mensaje: "[Candidato] está listo para la entrevista. Enviamos referencias"
   - Objetivo: Notificar progreso

3. ENTREVISTA COMPLETADA
   - Trigger: Cambio de estatus a siguiente (investigación)
   - Delay: Inmediato
   - Mensaje: "Entrevista completada. Procesando referencias..."
   - Objetivo: Confirm contacto exitoso

PARÁMETROS:
- Mensajes genéricos (evitar conversación personalizada)
- Precisa pero sin detalles que requieran respuesta inmediata
- Objetivo: Crear "margen de tiempo" sin preguntas del cliente
- CALIDAD EMPRESARIAL puede intervenir manualmente si necesario
```

---

#### 3. **Envío Automático de Enlace al Candidato para Llenar Datos**
**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 4-6 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Automatizar envío de enlace para que candidato llene su información

TRIGGER: Al registrar candidato en sistema (CALIDAD EMPRESARIAL)
TIMING: Inmediato (no esperar a after entrevista)

FLUJO:
1. CALIDAD EMPRESARIAL registra candidato
   ↓
2. Sistema envía SMS/email con enlace
   ↓
3. Candidato completa:
   - Historial laboral básico (empleos)
   - Datos personales básicos
   - Documentación (opcional)
   ↓
4. CALIDAD EMPRESARIAL revisa y ajusta si necesario

NOTA: Candidato llena LO QUE PUEDE:
- Historial personal ✅
- Datos básicos ✅
- Puesto solicitado ❌ (lo llena CALIDAD)
- CEDIS/Plaza ❌ (lo llena CALIDAD)
  (Candidatos confunden "vendedor" con "almacenista")

BENEFICIO:
- Menos trabajo manual para CALIDAD
- Candidato llena antes de la entrevista
- Datos más precisos
```

---

#### 4. **Reorganización del Dashboard cliente (BIG UX ISSUE)**
**Prioridad:** 🔴 CRÍTICA  
**Tiempo estimado:** 12-16 horas (refactor UI completa)  
**Responsable:** Frank Saavedra + Antigravity  

```
PROBLEMA ACTUAL:
Dashboard no muestra información CRÍTICAque clientes preguntan constantemente:

FALTA:
❌ Calificación general de desempeño (está capturada, NO se muestra)
❌ Motivo de salida/baja del empleo (está capturado, NO se muestra)
❌ Incidencias (capturadas, NO se muestran)
❌ Antecedentes legales (capturados, NO se muestran)
❌ Quién proporcionó la referencia (está capturado, NO se muestra)
❌ Evaluación del desempeño by jefe (capturada, NO se muestra)
❌ Reportes automáticos de entrevistas laborales
❌ Semanas cotizadas (visualización pobre)

NECESARIA REORGANIZACIÓN:
1. Perfil Extendido: Organizar por MÓDULOS (como en Excel)
   - Módulo: "Datos Generales"
   - Módulo: "Información Laboral"
   - Módulo: "Incidencias y Antecedentes"
   - Módulo: "Evaluación de Desempeño"
   - No "todo amontonado"

2. Expediente Completo: Mostrar TODO lo que está capturado
   - Incluir: motivo salida, desempeño, jefe, incidencias, legal
   - Formato: Tabla limpia, fácil de leer para cliente

3. Reportes Automáticos de Entrevistas Laborales:
   - Mostrar detalles de cada contacto con empleador
   - Ej. "Contacto con Sabritas: Contactado en 3 intentos. Razón: Renuncia voluntaria"
   - Per empleor, per empresa, detallado

BENEFICIO:
- Cliente ve TODO en un lugar
- Menos preguntas WhatsApp sobre "¿qué pasó con X?"
- Transparencia total
```

---

### 🟠 ALTAS (Medio-Alto impacto)

#### 5. **Formulario Digital para Encuestadores (Armados)**
**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 10-12 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Reemplazar envío manual de Excel con formulario digital en sistema

ESTADO ACTUAL:
1. CALIDAD EMPRESARIAL envía formato Excel al encuestador
2. Encuestador llena manualmente
3. Encuestador devuelve Excel
4. Leida/Paola revisan y acomodan
5. CALIDAD EMPRESARIAL revisa y finaliza

ESTADO DESEADO:
1. Encuestador recibe enlace en sistema
2. Completa formulario digital (campos guiados)
3. Sube fotos/documentación
4. Submit → Armado automático (sin pasos 3-5)

FORMULARIOS POR CLIENTE (9 variantes):
- Sigma Alimentos Sureste (BASE - más completo, +1 hora)
- Sigma Naucalpan (+30 min)
- AADEO (+30 min)
- Red Servicios (con antecedentes legales + notas periodísticas)
- Grupo Vanguardia
- JM (con visita de inicio obligatoria)
- Otros 3 más (menos frecuentes)

CAMPOS GENÉRICOS:
- Datos demográficos (edad, sexo, hijos)
- Información de domicilio
- Fotos (rostro, cuerpo completo, casa interior/exterior)
- Mapa + ubicación
- Redes sociales (si aplica)
- Semanas cotizadas (IMSS, si aplica)
- Antecedentes legales (si aplica)
- Notas periodísticas (si aplica)

BENEFICIO:
- Elimina 30-60 minutos por estudio (no acomodar manual)
- Estandariza información
- Menos errores
- Más rápida entrega al cliente
```

---

#### 6. **Reubicación de "Semanas Cotizadas" en UI**
**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 2-3 horas  
**Responsable:** Frank/Antigravity  

```
PROBLEMA ACTUAL:
"Semanas Cotizadas" está dentro del panel de edición de empleos
→ No es intuitivo
→ Se obtiene DESPUÉS de empleos
→ Ocupa espacio

CAMBIO SOLICITADO:
Mover a ubicación independiente en Perfil Extendido

UBICACIÓN NUEVA:
┌─ Candidato Detalle
├─ Datos Generales
├─ 📊 SEMANAS COTIZADAS (independiente, arriba de historial)
│  └─ Upload imagen/PDF
│  └─ Símbolo: Indica si completado
├─ Historial Laboral
└─ Documentación

RAZÓN:
- Se captura independientemente de empleos
- Clientes como Sigma requieren VERLO prominente
- Empleadas suben archivos/fotos directamente
- No aplica a todos (mejor dejar vacío si N/A)
```

---

#### 7. **Automatización del Flujo de Cambio de Estatus**
**Prioridad:** 🟠 ALTA  
**Tiempo estimado:** 4-6 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Ordenar y automatizar transiciones de estado de candidato

ORDEN CORRECTO (IDENTIFICADO EN REUNIÓN):
1. Sin Asignar (default)
2. Asignado (después de crear proceso)
3. No Entrevistado (tiempo transcurriendo)
4. Entrevistado ← TRIGGER para notificación WhatsApp
5. Investigación ← Se inicia después de entrevista
6. Visita Programada
7. Visitado
8. Recomendable / No Recomendable

PROBLEMA ACTUAL:
- Orden confuso en UI
- "Investigación" se muestra antes de "Entrevistado"
- Causa confusión (investigación implica YA fue entrevistado)

CAMBIO:
Reordenar UI para que flujo sea secuencial lógico

VALIDACIONES:
- Marcar "Entrevistado" → Trigger aviso a cliente
- After "Entrevistado" → Permitir "Investigación"
- Etc.
```

---

### 🟡 MEDIAS (Bajo-Medio impacto)

#### 8. **Formato Final de Estudio en Sistema (No Excel)**
**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 8-10 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Generar reporte final (PDF) directamente del sistema

ESTADO ACTUAL:
- Armado en Excel manual
- Convertido a PDF para entregar
- Paula aún requiere revisión en Excel

ESTADO DESEADO:
- Sistema jalara automáticamente datos capturados
- Genera PDF/reporte final directo
- Paula revisa directamente en sistema (NO Excel)
- Entrega a cliente = PDF automático

GARANTIZAR:
- Información correcta extraída
- Formato limpio en PDF
- Estructura según cliente (Sigma vs Otros)
- Automatización 100%
```

---

#### 9. **Reportes Automáticos de Entrevistas Laborales (Per Empleador)**
**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 6-8 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Sistema genera reporte de cada contacto con empleador

TRIGGER: Después de que analista captura detalles de contacto

INCLUYENDA:
- Empresa contactada (Ej. Sabritas, Pepsi, Coppel)
- Método: Llamada, Correo, Portalí IMSS
- Resultado: Completado, Pendiente, No Disponible, Buzón
- Información obtenida: Razón de salida, desempeño, fechas, etc.
- Detalles específicos

MENSAJE A CLIENTE (AUTOMÁTICO):
"Contacto con Sabritas completado: Confirmó renuncia voluntaria, buen desempeño"

BENEFICIO:
- Cliente ve progreso granular
- No tiene que preguntar "¿qué pasó con X empresa?"
- Transparencia
- Reduce carga WhatsApp
```

---

#### 10. **Control de Visita Domiciliaria (Sincronización)**
**Prioridad:** 🟡 MEDIA  
**Tiempo estimado:** 4-6 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Mejorar sincronización entre candidato, visitador y cliente

PROBLEMA ACTUAL:
- Cliente presiona por reporte ANTES de que visitador cumpla plazo (24h)
- CALIDAD EMPRESARIAL tiene que contactar visitador (interrupe)
- Visitadores piden pago extra por entrega rápida (no autorizado)

SOLUCIÓN:
- Crear proceso fluido en sistema
- Visitador sube información en tiempo real (fotos, datos)
- Sistema extrae y genera armado automático
- Entrega a cliente dentro del plazo (sin que CALIDAD intervenga)

BENEFICIO:
- Reduce interrupciones
- Evita fricción con visitadores
- Cliente recibe a tiempo
- CALIDAD se concentra en revisión (no coordinación)
```

---

### 🟢 BAJAS (Mejoras menores)

#### 11. **Plantillas de Mensaje WhatsApp Estandarizadas**
**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 2-3 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Guardar templates de mensajes para reutilización

MENSAJES ACTUALES (IDENTIFICADOS):
1. "Le informo que estamos gestionando empleos..."
2. "Hasta el momento va recomendable. Seguimos referencias pendientes"
3. "Ya se agregó información a la historia laboral"
4. "Estamos buscando al candidato..." (con evidencia de intentos)

IMPLEMENTAR:
- Guardar templates en sistema
- CALIDAD EMPRESARIAL selecciona + personaliza
- Reduce tiempo de escribir (copy-paste)

BENEFICIO:
- Ahorra 2-3 minutos por mensaje (son muchos diarios)
- Consistencia en comunicación
- Menos errores tipográficos
```

---

#### 12. **Dashboard de Carga Laboral (Para Paula)**
**Prioridad:** 🟢 BAJA  
**Tiempo estimado:** 3-4 horas  
**Responsable:** Frank Saavedra  

```
DESCRIPCIÓN:
Visualizar carga de trabajo en tiempo real para Paula (coordinadora)

MÉTRICAS:
- Candidatos en "amarillo" (requieren avance)
- Procesos "atrasados" (superar 3 días)
- Mensajes WhatsApp (sin responder)
- Reportes pendientes de armado
- Visitadores con retrasos

BENEFICIO:
- Paula ve en dónde está el cuello de botella
- Puede redistribuir trabajo proactivamente
- Data-driven decisionmaking
```

---

## 📁 ARCHIVOS ANALIZADOS EN `/context/armado/`

```
1. AVISO DE PRIVACIDAD SINERGIA RH OCTUBRE 2025.pdf
   → Documento que visitadores llevan para firma del candidato
   → Necesario para incluir en armado/reporte final

2. FORMATO SIGMA SURESTE SINERGIA EMPRESARIAL OCTUBRE 2025.xlsx
   → Formato BASE (más completo, ~1 hora de armado)
   → Referencia para otros 8 formatos
   → Campos: Datos demográficos, domicilio, fotos, mapa, redes sociales, etc.

3. LizarhyGuadalupeVazquezCordova_Sociolaboral_CEDIMERIDA_2026-03-02.pdf
   → Ejemplo de estudio ARMADO final (PDF)
   → Muestra cómo se entrega a cliente
   → Referencia para generación automática
```

---

## 🎯 RESUMEN POR IMPACTO

### Bloqueantes (Implementar ANTES de todo)
1. Formulario Web para Alta de Candidatos — 6-8h
2. Automatización notificaciones WhatsApp — 8-10h
3. Envío automático de enlace al candidato — 4-6h

**Total:** 18-24 horas (2-3 días SOFIA)

### Importantes (Implementar SOON)
4. Reorganización Dashboard cliente — 12-16h
5. Formulario Digital para Encuestadores — 10-12h
6. Reubicación "Semanas Cotizadas" — 2-3h
7. Automatización de Cambio de Estatus — 4-6h

**Total:** 28-37 horas (3-5 días SOFIA + Antigravity)

### Mejoras (Nice-to-have)
8. Formato en Sistema (no Excel) — 8-10h
9. Reportes Entrevistas Laborales — 6-8h
10. Control de Visita — 4-6h
11. Templates WhatsApp — 2-3h
12. Dashboard Paula — 3-4h

**Total:** 26-34 horas (3-4 días después)

---

## 📊 TIMELINE PROPUESTO

### FASE 1 (3 días) — BLOQUEANTES
- Forum Web + Auto Notificaciones + Auto Enlace
- **Impacto:** Reduce 60-70% carga WhatsApp CALIDAD

### FASE 2 (1 semana) — IMPORTANTES
- Dashboard Reorganizado + Formulario Encuestadores
- **Impacto:** Acelera armados, mejora transparencia cliente

### FASE 3 (Después) — MEJORAS
- Formato Sistema, Reportes automáticos, etc.
- **Impacto:** Refinamientos, escalabilidad

---

## 💭 PRÓXIMAS ACCIONES

**Frank Saavedra:**
1. [ ] Revisar este abstracto con CALIDAD EMPRESARIAL
2. [ ] Confirmar prioridades (¿Phase 1 primero?)
3. [ ] Recolectar documentación faltante:
   - Ejemplo armado Red Servicios (antecedentes + notas)
   - Formato vacío Sigma (para copiar estructura)
4. [ ] Empezar Phase 1 (bloqueantes)

**CALIDAD EMPRESARIAL:**
1. [ ] Validar que funcionalidades sean correctas
2. [ ] Enviar documentación faltante
3. [ ] Beta test cuando esté listo

---

**Resumen completado:** 9 de marzo de 2026  
**Status:** Listo para discusión + planning
