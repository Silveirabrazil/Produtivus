<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Protegido pelo mesmo secret do install.json
$cfgPath = __DIR__ . '/../config/install.json';
$cfg = @json_decode(@file_get_contents($cfgPath), true);
$secretCfg = is_array($cfg) && array_key_exists('secret', $cfg) ? trim((string)$cfg['secret']) : '';
$secretIn = isset($_GET['secret']) ? trim((string)$_GET['secret']) : '';
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

try {
  $conn->beginTransaction();
  $email = 'pv_test_' . time() . '@example.com';
  $name = 'PV Test';
  $pwd = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
  $ins = $conn->prepare('INSERT INTO users (name, email, password) VALUES (:n,:e,:p)');
  $ins->execute([':n'=>$name, ':e'=>$email, ':p'=>$pwd]);
  $id = $conn->lastInsertId();
  $del = $conn->prepare('DELETE FROM users WHERE id = :id');
  $del->execute([':id'=>$id]);
  $conn->commit();
  echo json_encode(['success'=>true,'write'=>true]);
} catch (Throwable $e) {
  if ($conn->inTransaction()) { $conn->rollBack(); }
  if (function_exists('error_log')) { error_log('[Produtivus][db_write_test] '.$e->getMessage()); }
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Write test failed']);
}
