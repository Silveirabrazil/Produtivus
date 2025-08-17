<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Autorização por secret (usa server/config/install.json)
$installCfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secretCfg = is_array($installCfg) && array_key_exists('secret', $installCfg) ? (string)$installCfg['secret'] : '';
$secretIn = isset($_GET['secret']) ? (string)$_GET['secret'] : (isset($_POST['secret']) ? (string)$_POST['secret'] : '');
if (trim($secretCfg) === '' || trim($secretIn) === '' || !hash_equals(trim($secretCfg), trim($secretIn))) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Método não suportado']); exit; }

// Aceita multipart/form-data com input name="file" (ou "zip")
$file = $_FILES['file'] ?? ($_FILES['zip'] ?? null);
if (!$file || !is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Arquivo não recebido']);
  exit;
}

// Validações básicas
$name = (string)($file['name'] ?? 'deploy.zip');
$tmp = (string)($file['tmp_name'] ?? '');
$size = (int)($file['size'] ?? 0);
if ($size <= 0 || !is_uploaded_file($tmp)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Upload inválido']); exit; }
if (!preg_match('/\.zip$/i', $name)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Apenas arquivos .zip']); exit; }

$root = dirname(__DIR__, 2); // .../public
$target = $root . '/deploy.zip';

// Move arquivo
if (!@move_uploaded_file($tmp, $target)) {
  // fallback: copy + unlink
  if (!@copy($tmp, $target)) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Falha ao gravar deploy.zip']);
    exit;
  }
  @unlink($tmp);
}

echo json_encode(['success'=>true,'message'=>'deploy.zip enviado']);
?>