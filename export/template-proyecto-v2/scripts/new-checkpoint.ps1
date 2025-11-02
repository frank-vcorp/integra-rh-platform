# Requires: PowerShell 5+
param(
  [Parameter(Mandatory=$true)] [string]$Proyecto,
  [Parameter(Mandatory=$true)] [string]$Modulo,
  [Parameter(Mandatory=$true)] [string]$Agente,
  [string[]]$Tareas
)

$ts = Get-Date -Format "yyyy-MM-dd_HHmm"
$dir = Join-Path -Path (Get-Location) -ChildPath "Checkpoints"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir ("CHK_{0}.md" -f $ts)

$tareasLine = if ($Tareas -and $Tareas.Count -gt 0) { ($Tareas -join ', ') } else { "" }

$content = @()
$content += "# Dossier de Checkpoint: $Proyecto"
$content += ""
$content += "**ID del Checkpoint:** $ts"
$content += ""
$content += "**Módulo/Componente:** `$Modulo`"
$content += ""
$content += "**Agente Principal:** $Agente"
$content += ""
if ($tareasLine -ne "") { $content += "**Tareas PROYECTO.md Asociadas:** $tareasLine" }
$content += ""
$content += "---"
$content += ""
$content += "## 1. Resumen Ejecutivo (Para el Director de Proyecto)"
$content += ""
$content += "**Objetivo de la Sesión:** [Objetivo principal]"
$content += ""
$content += "**Estado al Finalizar:** [Completado / Parcial / Bloqueado]"
$content += ""
$content += "---"
$content += ""
$content += "## 2. Snapshot Técnico (Para Continuidad de IA)"
$content += ""
$content += "### 2.1. Descripción Funcional"
$content += "[Descripción breve del módulo y su rol]"
$content += ""
$content += "### 2.2. Checklist de Tareas Técnicas Completadas"
$content += "[ ] [Tarea Técnica 1]"
$content += "[ ] [Tarea Técnica 2]"
$content += ""
$content += "### 2.3. Archivos Clave Modificados o Creados"
$content += "[ACCIÓN]: [ruta/al/archivo]"
$content += ""
$content += "---"
$content += ""
$content += "## 3. Arquitectura y Contratos (Para Trabajo en Paralelo)"
$content += ""
$content += "### 3.1. Dependencias Nuevas o Críticas"
$content += "[paquete]: \"[versión]\""
$content += ""
$content += "### 3.2. Estructuras de Datos / Modelos / Schemas"
$content += "// ruta/al/archivo"
$content += "[Pega fragmento relevante]"
$content += ""
$content += "### 3.3. Interfaces y Contratos de API (Si aplica)"
$content += "Interfaz/Endpoint: [método] [ruta]"
$content += "Descripción: [qué hace]"
$content += "Request: [estructura]"
$content += "Response: [estructura]"
$content += ""
$content += "---"
$content += ""
$content += "## 4. Estado y Próximos Pasos"
$content += ""
$content += "### 4.1. Bloqueos y Decisiones Pendientes"
$content += "Bloqueo: [Si aplica]"
$content += "Decisión Pendiente: [Si aplica]"
$content += ""
$content += "### 4.2. Contexto para Otros Módulos/Agentes"
$content += "Para [Agente/Módulo]: [Instrucción]"
$content += ""
$content += "### 4.3. Siguientes Pasos para ESTE Módulo"
$content += "[ ] [Próxima tarea (formato PROYECTO.md)]"
$content += "[ ] [Siguiente tarea]"

Set-Content -Path $file -Value $content -Encoding UTF8
Write-Host "Checkpoint creado:" $file
