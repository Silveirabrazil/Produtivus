<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Proteção por secret
$cfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secretCfg = is_array($cfg) && array_key_exists('secret', $cfg) ? trim((string)$cfg['secret']) : '';
$secretIn = isset($_GET['secret']) ? trim((string)$_GET['secret']) : (isset($_POST['secret']) ? trim((string)$_POST['secret']) : '');
if ($secretCfg === '' || $secretIn === '' || !hash_equals($secretCfg, $secretIn)) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

require_once __DIR__ . '/../config/database.php';
if (!isset($conn) || !($conn instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'DB connection not available']);
  exit;
}

$schemaPath = dirname(__DIR__) . '/schema.sql';
if (!@is_file($schemaPath)) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'schema.sql not found','path'=>$schemaPath]);
  exit;
}
$sql = @file_get_contents($schemaPath);
if ($sql === false) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Failed to read schema.sql']);
  exit;
}

try {
  $conn->beginTransaction();
  $norm = str_replace(["\r\n","\r"], "\n", $sql);
  // Remove comentários /* ... */ e linhas começando com --
  $norm = preg_replace('/\/\*[^*]*\*+(?:[^\/*][^*]*\*+)*\//m', '', $norm);
  $norm = preg_replace('/^\s*--.*$/m', '', $norm);
  // Divide e executa
  $stmts = array_map('trim', explode(';', $norm));
  $executed = 0;
  foreach ($stmts as $stmt) {
    if ($stmt === '') continue;
    $conn->exec($stmt);
    $executed++;
  }
  $conn->commit();
  echo json_encode(['success'=>true,'installed'=>true,'executed'=>$executed]);
} catch (Throwable $e) {
  if ($conn->inTransaction()) { $conn->rollBack(); }
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Install failed']);
}
