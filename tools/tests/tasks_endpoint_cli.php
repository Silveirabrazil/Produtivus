<?php
// Ferramenta auxiliar para validar tasks.php via CLI/local.
// Uso: php tools/tests/tasks_endpoint_cli.php
session_start();
$_SESSION['user_id'] = 1;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require __DIR__ . '/../../server/api/tasks.php';
