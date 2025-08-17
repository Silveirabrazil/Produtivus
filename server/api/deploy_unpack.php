<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Autorização por secret (reutiliza server/config/install.json)
$installCfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secretCfg = is_array($installCfg) && array_key_exists('secret', $installCfg) ? (string)$installCfg['secret'] : '';
$secretIn = isset($_GET['secret']) ? (string)$_GET['secret'] : (isset($_POST['secret']) ? (string)$_POST['secret'] : '');
if (trim($secretCfg) === '' || trim($secretIn) === '' || !hash_equals(trim($secretCfg), trim($secretIn))) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

$root = dirname(__DIR__, 2); // .../public
$zipPath = $root . '/deploy.zip';

if (!class_exists('ZipArchive')) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'ZipArchive não disponível no servidor']);
  exit;
}

if (!is_file($zipPath)) {
  http_response_code(404);
  echo json_encode(['success'=>false,'message'=>'deploy.zip não encontrado em public/']);
  exit;
}

try {
  $zip = new ZipArchive();
  if ($zip->open($zipPath) !== true) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Falha ao abrir deploy.zip']);
    exit;
  }
  // Extrai na raiz do site
  if (!$zip->extractTo($root)) {
    $zip->close();
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Falha na extração']);
    exit;
  }
  $count = $zip->numFiles;
  $zip->close();
  // Remove o zip após sucesso (opcional)
  @unlink($zipPath);
  echo json_encode(['success'=>true,'extracted'=>$count]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Erro no servidor']);
}

?>