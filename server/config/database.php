<?php
header('Content-Type: application/json; charset=utf-8');

// Fonte primária: server/config/db.json (produção)
// Fallback: variáveis de ambiente (SetEnv no .htaccess) e por fim defaults de dev
$host = '127.0.0.1';
$db_name = 'produtivus_db';
$username = 'produtivus';
$password = 'produtivus123!';

// 1) Tentar ler JSON de config
$cfgFile = __DIR__ . '/db.json';
if (@is_file($cfgFile) && @is_readable($cfgFile)) {
  $raw = @file_get_contents($cfgFile);
  $cfg = @json_decode($raw, true);
  if (is_array($cfg)) {
    if (!empty($cfg['host'])) $host = (string)$cfg['host'];
    if (!empty($cfg['name'])) $db_name = (string)$cfg['name'];
    if (!empty($cfg['user'])) $username = (string)$cfg['user'];
    if (array_key_exists('pass', $cfg)) $password = (string)$cfg['pass'];
  }
}

// 2) Variáveis de ambiente podem sobrescrever
$host = getenv('DB_HOST') ?: $host;
$db_name = getenv('DB_NAME') ?: $db_name;
$username = getenv('DB_USER') ?: $username;
$password = getenv('DB_PASS') !== false ? getenv('DB_PASS') : $password;

// Verifica se o driver pdo_mysql está habilitado para evitar erro 500 genérico
if (!class_exists('PDO') || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => 'Driver pdo_mysql não habilitado no PHP. Habilite "extension=pdo_mysql" no php.ini (ou selecione versão PHP com PDO MySQL no cPanel).'
  ]);
  exit;
}

try {
  $conn = new PDO(
    "mysql:host=$host;dbname=$db_name;charset=utf8mb4",
    $username,
    $password,
    [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]
  );
} catch (PDOException $e) {
  // Loga o erro detalhado no servidor e retorna mensagem genérica ao cliente
  if (function_exists('error_log')) {
    error_log('[Produtivus][DB] ' . $e->getMessage());
  }
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => 'Erro de conexão ao banco de dados.'
  ]);
  exit;
}
?>