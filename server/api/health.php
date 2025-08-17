<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

$resp = [
  'ok' => true,
  'time' => date('c'),
  'php' => PHP_VERSION,
  'db' => false,
];

try {
  // Tenta abrir conexão do projeto
  @require_once __DIR__ . '/../config/database.php';
  if (isset($conn) && $conn instanceof PDO) {
    try {
      $stmt = $conn->query('SELECT 1');
      $resp['db'] = $stmt !== false;
    } catch (Throwable $e) {
      $resp['db'] = false;
      $resp['db_error'] = 'query_failed';
    }
  }
} catch (Throwable $e) {
  $resp['db'] = false;
  $resp['db_error'] = 'include_failed';
}

echo json_encode($resp);