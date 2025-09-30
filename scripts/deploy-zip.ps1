<#
 .SYNOPSIS
   Gera um pacote ZIP para deploy contendo apenas os arquivos necessários.
 .DESCRIPTION
   Usa lista de inclusão e exclusão para montar artefato limpo (deploy.zip) em ./_deploy.
   Ajuste $IncludePaths e $ExcludePatterns conforme o crescimento do projeto.
 .NOTES
   Executar: powershell -ExecutionPolicy Bypass -File scripts/deploy-zip.ps1
#>

param(
  [string]$OutputDir = "_deploy",
  [string]$ZipName = "deploy.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Preparando pacote de deploy..." -ForegroundColor Cyan

# 1. Limpa diretório de saída
$fullOut = Join-Path -Path (Get-Location) -ChildPath $OutputDir
if (Test-Path $fullOut) {
  Remove-Item -Recurse -Force $fullOut
}
New-Item -ItemType Directory -Path $fullOut | Out-Null

# 2. Lista de caminhos a incluir (diretórios raiz relevantes)
$IncludePaths = @(
  'index.html','login.html','dashboard.html','planilhas.html','mapas.html','cadernos.html','cadernos-novo.html','tarefas.html','estudos.html','manifest.json',
  'css','js','img','inc','server','config','apps','package.json'
)

# 3. Padrões a excluir (glob simples / regex via -match)
$ExcludePatterns = @(
  '^css/.*\.scss$',              # SCSS fonte não necessário no servidor final (barra para caminhos relativos)
  'node_modules',
  '^server\\data\\.*\\.db$',  # Bases locais
  '^server\\logs',
  '\\.*\\__tests__\\',
  '\\.*\\tests\\',
  '^\.git',
  '\\scripts\\',
  '\\logs\\',
  'sync_config\\.jsonc',
  '\\README\\.md$',
  '\\.*\\README\\.md$'
)

function Should-Exclude($path) {
  foreach ($pat in $ExcludePatterns) { if ($path -match $pat) { return $true } }
  return $false
}

# 4. Copia arquivos filtrados para staging
foreach ($item in $IncludePaths) {
  if (-not (Test-Path $item)) { Write-Warning "Ignorado (não existe): $item"; continue }

  if (Test-Path $item -PathType Container) {
    Get-ChildItem -Recurse -File $item | ForEach-Object {
      $rel = $_.FullName.Substring((Get-Location).Path.Length + 1)
      if (Should-Exclude $rel) { return }
      $dest = Join-Path $fullOut $rel
      $destDir = Split-Path $dest -Parent
      if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
      Copy-Item $_.FullName $dest
    }
  } else {
    if (-not (Should-Exclude $item)) { Copy-Item $item $fullOut }
  }
}

# 5. Cria ZIP
$zipPath = Join-Path (Get-Location) $ZipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $fullOut '*') -DestinationPath $zipPath

Write-Host "==> Pacote gerado: $zipPath" -ForegroundColor Green
Write-Host "Tamanho:" ((Get-Item $zipPath).Length / 1KB).ToString('F1') 'KB'
Write-Host "Envie este artefato via painel de hospedagem ou SFTP." -ForegroundColor Yellow

# 6. Sugestão de próxima etapa
Write-Host "(Opcional) Adapte para GitHub Action criando workflow .github/workflows/deploy.yml" -ForegroundColor DarkCyan
