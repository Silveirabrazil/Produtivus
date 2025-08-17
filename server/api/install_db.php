<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Le o secret a partir de server/config/install.json
$installCfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secretCfg = is_array($installCfg) && array_key_exists('secret', $installCfg) ? (string)$installCfg['secret'] : '';
// aceita secret via GET ou POST
$secretIn = '';
if (isset($_GET['secret'])) { $secretIn = (string)$_GET['secret']; }
elseif (isset($_POST['secret'])) { $secretIn = (string)$_POST['secret']; }
// tolera espaços acidentais
$secretCfgTrim = trim($secretCfg);
$secretInTrim = trim($secretIn);
if ($secretCfgTrim === '' || $secretInTrim === '' || !hash_equals($secretCfgTrim, $secretInTrim)) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

// Conecta usando a config do app
require_once __DIR__ . '/../config/database.php';
if (!isset($conn) || !($conn instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'DB connection not available']);
  exit;
}

// Prossegue para aplicar o schema completo (CREATE TABLE IF NOT EXISTS garante idempotência)

$schemaPath = dirname(__DIR__) . '/schema.sql';
if (!@is_file($schemaPath)) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'schema.sql not found']);
  exit;
}
$sql = @file_get_contents($schemaPath);
if ($sql === false) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Failed to read schema.sql']);
  exit;
}

// Remove comentários e executa statements separados por ';'
// Observação: o schema pode começar com linhas "-- ..."; precisamos preservá-lo removendo os comentários antes de dividir
try {
  $conn->beginTransaction();

  // Normaliza quebras de linha
  $norm = str_replace(["\r\n", "\r"], "\n", $sql);
  // Remove comentários de bloco /* ... */ (multilinha)
  $norm = preg_replace('/\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\//m', '', $norm);
  // Remove comentários de linha que começam com -- até o fim da linha
  $norm = preg_replace('/^\s*--.*$/m', '', $norm);

  // Divide por ';' e executa cada statement não-vazio
  $stmts = array_map('trim', explode(';', $norm));
  $count = 0;
  foreach ($stmts as $stmt) {
    if ($stmt === '') continue;
    $conn->exec($stmt);
    $count++;
  }

  $conn->commit();
  echo json_encode(['success'=>true,'installed'=>true,'executed'=>$count]);
} catch (Throwable $e) {
  if ($conn->inTransaction()) { $conn->rollBack(); }
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Install failed']);
}
