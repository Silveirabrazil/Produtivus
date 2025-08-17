<?php
// Include this in protected endpoints to require a logged-in session
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_session_bootstrap.php';
if (!isset($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Não autenticado']);
  exit;
}
