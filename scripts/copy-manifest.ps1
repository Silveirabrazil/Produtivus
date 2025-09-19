# Script para copiar o manifest do Vite para a raiz do dist após o build
# Salve como scripts/copy-manifest.ps1 e execute após o build

$source = "apps/mindmaps/dist/.vite/manifest.json"
$dest = "apps/mindmaps/dist/manifest.json"

if (Test-Path $source) {
    Copy-Item $source $dest -Force
    Write-Host "Manifest copiado para $dest"
} else {
    Write-Host "Manifest não encontrado em $source"
}
