<?php
// Ferramenta auxiliar para validar account.php em CLI/local.
// Uso: php tools/tests/account_endpoint_cli.php
// Define sessão fictícia e executa o endpoint.
session_start();
$_SESSION['user_id'] = 1;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
require __DIR__ . '/../../server/api/account.php';
