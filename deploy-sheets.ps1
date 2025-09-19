param(
	[Parameter(Mandatory = $true)]
	[string]$TargetRoot,
	[switch]$IncludeHtml
)

$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcDist = Join-Path $here 'apps/sheets/dist'
$srcHtml = Join-Path $here 'planilhas.html'

if (!(Test-Path $srcDist)) {
	Write-Error "Pasta de build não encontrada: $srcDist. Execute a build primeiro (npm --prefix apps/sheets run build)."
}

$dstDist = Join-Path $TargetRoot 'apps/sheets/dist'

# Cria destino
New-Item -ItemType Directory -Path $dstDist -Force | Out-Null

Write-Host "Copiando dist -> $dstDist"
# Copia todos os arquivos preservando estrutura
robocopy $srcDist $dstDist /MIR /NFL /NDL /NJH /NJS /NP | Out-Null

if ($IncludeHtml) {
	$dstHtml = Join-Path $TargetRoot 'planilhas.html'
	Write-Host "Copiando planilhas.html -> $dstHtml"
	Copy-Item $srcHtml $dstHtml -Force
}

Write-Host "OK: deploy concluído."
