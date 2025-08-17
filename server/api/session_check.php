<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/_session_bootstrap.php';

// Grava um valor de teste para checar persistência
if (!isset($_SESSION['__pv_test'])) {
  $_SESSION['__pv_test'] = ['setAt' => date('c'), 'rand' => bin2hex(random_bytes(4))];
}

$resp = [
  'session_id' => session_id(),
  'has_user' => isset($_SESSION['user_id']),
  'user' => isset($_SESSION['user_name']) ? $_SESSION['user_name'] : null,
  'test' => $_SESSION['__pv_test'],
  'cookie_params' => session_get_cookie_params(),
];
echo json_encode($resp);
