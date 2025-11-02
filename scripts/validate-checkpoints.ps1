# Validates that each Checkpoint file name timestamp matches the internal ID line.
param(
  [switch]$Fix
)

$dir = Join-Path -Path (Get-Location) -ChildPath "Checkpoints"
if (!(Test-Path $dir)) { Write-Host "No existe carpeta Checkpoints"; exit 1 }

$files = Get-ChildItem -Path $dir -Filter "CHK_*.md" -File | Sort-Object Name
$errors = 0
foreach ($f in $files) {
  if ($f.Name -match '^CHK_(\d{4}-\d{2}-\d{2}_\d{4})\.md$') {
    $fromName = $Matches[1]
    $lines = Get-Content -Path $f.FullName
    $idx = $lines | Select-String -Pattern '^\*\*ID del Checkpoint:\*\*\s*(.+)$' | Select-Object -First 1
    if ($null -eq $idx) {
      Write-Host "[WARN] Falta línea de ID en" $f.Name
      $errors++
      continue
    }
    $lineNo = $idx.LineNumber - 1
    $m = [regex]::Match($lines[$lineNo], '^\*\*ID del Checkpoint:\*\*\s*(.+)$')
    $inFile = $m.Groups[1].Value.Trim()
    if ($inFile -ne $fromName) {
      Write-Host "[MISMATCH]" $f.Name ":" $inFile "!=" $fromName
      $errors++
      if ($Fix) {
        $lines[$lineNo] = "**ID del Checkpoint:** $fromName"
        Set-Content -Path $f.FullName -Value $lines -Encoding UTF8
        Write-Host "[FIXED]  Actualizado ID dentro del archivo ->" $fromName
      }
    }
  } else {
    Write-Host "[SKIP] Nombre no coincide con patrón CHK_YYYY-MM-DD_HHMM.md:" $f.Name
  }
}

if ($errors -gt 0 -and -not $Fix) {
  Write-Host "\nSugerencia: ejecutar con -Fix para corregir IDs dentro de los archivos." -ForegroundColor Yellow
}
