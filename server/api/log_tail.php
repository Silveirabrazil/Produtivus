<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secret = is_array($cfg) && isset($cfg['secret']) ? (string)$cfg['secret'] : '';
$in = isset($_GET['secret']) ? (string)$_GET['secret'] : '';
if (!$secret || !$in || !hash_equals(trim($secret), trim($in))) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

$logFile = __DIR__ . '/error_log';
if (!@is_file($logFile)) {
  echo json_encode(['success'=>true,'lines'=>[]]);
  exit;
}
$lines = @file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
if ($lines === false) { $lines = []; }
$tail = array_slice($lines, -200);
echo json_encode(['success'=>true,'lines'=>$tail]);
