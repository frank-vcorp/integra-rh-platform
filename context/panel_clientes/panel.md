# **🚀 HANDOFF DE ARQUITECTURA: PANEL DE CLIENTES (DASHBOARD)**

**PARA:** CODEX (Arquitecto de Soluciones)

**DE:** Frank (Director de Proyecto)

**FECHA:** 19 Nov 2025

**PRIORIDAD:** CRÍTICA 🔴

## **1\. CONTEXTO Y OBJETIVO**

Se requiere la reestructuración inmediata del módulo **"Panel de Clientes"** del sistema Integra-RH. La implementación actual es "ad-hoc" y no escalable. Debemos estandarizar la estructura de datos y la interfaz visual basándonos en los requerimientos operativos validados por el cliente (Paula).

**Objetivo Principal:** Implementar una visualización granular del estatus de los candidatos que permita al cliente ver el avance detallado (drill-down) y no solo un estatus genérico.

## **2\. NUEVOS REQUERIMIENTOS FUNCIONALES**

*(Filtrados para esta fase \- Ignorar otros módulos)*

1. **Niveles de Visualización:**  
   * **Vista Nivel 1 (Tarjeta/Lista):** Resumen rápido ("Semáforo").  
   * **Vista Nivel 2 (Detalle):** Al expandir, se debe mostrar el desglose de cada sub-proceso (Investigación, Referencias, Buró, etc.).  
2. **Nuevos Bloques de Información:**  
   * El cliente identificó vacíos en la estructura actual. Se deben agregar bloques para **Investigación Legal**, **Buró de Crédito** y **Especialista de Atracción** (quien gestiona la cuenta).  
3. **Gestión de Usuarios (Express):**  
   * Script o flujo para alta rápida de usuarios (Asistentes de Paula).  
   * Asignación de roles y passwords temporales.

## **3\. ESTRUCTURA DE DATOS (Fuente: Excel "Dashboard Cliente")**

Esta tabla refleja la estructura estandarizada que el cliente espera ver. Úsala para definir el esquema de base de datos (Firestore) y los tipos en TypeScript.

| Campo / Columna | Tipo de Dato Sugerido | Descripción / Reglas de Negocio |
| :---- | :---- | :---- |
| **Nombre del Candidato** | String | Nombre completo. |
| **Puesto** | String | Vacante a la que aplica. |
| **Fecha de Recepción** | Date | Inicio del proceso. |
| **Fecha de Cierre** | Date | Fin del proceso (calculado o manual). |
| **Especialista de Atracción** | String (Relación) | **NUEVO.** Nombre del reclutador/contacto en la empresa cliente. |
| **Investigación Laboral** | Status Object | Ej: "Con antecedentes no relevantes", "Historial positivo". |
| **Investigación Legal** | Status Object | **NUEVO.** Ej: "Sin antecedentes", "Historial crítico". |
| **Buró de Crédito** | Status Object | **NUEVO.** Ej: "Sin registro", "Aprobado", "Con deuda". |
| **Visita Domiciliaria/Virtual** | Rich Text / Link | Espacio para comentarios editables o enlace al reporte. |
| **Status General** | Enum | Estatus global (Cerrado, En Proceso, Pausado). |

## **4\. DIAGRAMA DE ARQUITECTURA DE DATOS (Mermaid)**

Este diagrama representa la relación entre la entidad principal y los nuevos bloques de detalle requeridos.

classDiagram  
    direction LR  
      
    %% Entidad Principal  
    class Candidato {  
        \+String id  
        \+String nombreCompleto  
        \+String puestoAplicado  
        \+Date fechaRecepcion  
        \+Date fechaCierre  
        \+String especialistaAtraccionId ::: nuevo  
        \+EstatusGeneral estatusVisual  
        \+DetalleProceso procesoDetallado  
    }

    %% Enumeración de Estado Global  
    class EstatusGeneral {  
        \<\<Enumeration\>\>  
        NUEVO  
        EN\_PROCESO  
        PAUSADO  
        CERRADO  
        DESCARTADO  
    }

    %% Objeto de Detalle (Drill-down)  
    class DetalleProceso {  
        \+InvestigacionLaboral invLaboral  
        \+InvestigacionLegal invLegal ::: nuevo  
        \+BuroCredito buroCredito ::: nuevo  
        \+VisitaDomiciliaria visita  
        \+computed getPorcentajeAvance()  
    }

    %% Clases de Estado Granular  
    class InvestigacionLaboral {  
        \+String resultado (ej. "Historial Positivo")  
        \+String detalles  
        \+Boolean completado  
    }

    class InvestigacionLegal {  
        \+String antecedentes (ej. "Sin Antecedentes")  
        \+Boolean flagRiesgo  
        \+String archivoAdjuntoUrl  
    }

    class BuroCredito {  
        \+String estatus (ej. "Sin Registro")  
        \+String score  
        \+Boolean aprobado  
    }

    class VisitaDomiciliaria {  
        \+String tipo (Virtual/Presencial)  
        \+String comentariosEditables  
        \+Date fechaRealizacion  
    }

    %% Relaciones  
    Candidato "1" \*-- "1" DetalleProceso : contiene  
    Candidato ..\> EstatusGeneral : tiene  
    DetalleProceso \*-- InvestigacionLaboral  
    DetalleProceso \*-- InvestigacionLegal  
    DetalleProceso \*-- BuroCredito  
    DetalleProceso \*-- VisitaDomiciliaria

    %% Estilos visuales para resaltar cambios nuevos  
    classDef nuevo fill:\#ff9966,stroke:\#333,stroke-width:2px,color:black;

## **5\. INSTRUCCIONES DE EJECUCIÓN (CODEX)**

Como Arquitecto, realiza las siguientes acciones en el repositorio:

1. **Actualizar PROYECTO.md:**  
   * Registra las tareas de Backend para la actualización del esquema de datos (Candidato).  
   * Registra las tareas de Frontend para la creación de los componentes de UI (Tarjeta Resumen y Modal de Detalle).  
   * Marca estas tareas con **Prioridad Alta**.  
2. **Generar/Actualizar SPEC:**  
   * Crea o edita context/SPEC-DASHBOARD.md.  
   * Incorpora la definición de datos de la tabla anterior.  
   * Incluye el diagrama Mermaid para referencia de SOFIA y GEMINI.  
3. **Validación de Base de Datos:**  
   * Confirma si la estructura actual en Firebase soporta estos objetos anidados o si se requiere una migración de datos.

Confirma cuando el SPEC esté listo para proceder con la construcción.