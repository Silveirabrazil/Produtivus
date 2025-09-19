<?php
header('Content-Type: application/json; charset=utf-8');

// Carrega configuração segura
require_once __DIR__ . '/../../config/app.php';

// Obtém configuração do banco de dados
$dbConfig = DatabaseConfig::get();
$host = $dbConfig['host'];
$db_name = $dbConfig['name'];
$username = $dbConfig['user'];
$password = $dbConfig['pass'];
$port = $dbConfig['port'] ?? 3306;

// Verifica drivers PDO disponíveis e configura fallback para desenvolvimento
$availableDrivers = class_exists('PDO') ? PDO::getAvailableDrivers() : [];
$hasMysql = in_array('mysql', $availableDrivers, true);
$hasSqlite = in_array('sqlite', $availableDrivers, true);

if (!$hasMysql && !$hasSqlite) {
  // Usar sistema mock para desenvolvimento quando PDO drivers não estão disponíveis
  require_once __DIR__ . '/mock_database.php';
  $conn = new MockDatabase();

  // Log do fallback
  if (function_exists('error_log')) {
    error_log('[Produtivus][DB] Usando sistema mock - drivers PDO não disponíveis');
  }
} else {
  try {
    // Usar SQLite como fallback em desenvolvimento se MySQL não estiver disponível
    $useSqlite = !$hasMysql && $hasSqlite;

    if ($useSqlite) {
      // Configuração SQLite para desenvolvimento
      $dbPath = __DIR__ . '/../data/produtivus_dev.sqlite';
      $dbDir = dirname($dbPath);
      if (!is_dir($dbDir)) {
        mkdir($dbDir, 0755, true);
      }

      $dsn = "sqlite:$dbPath";
      $conn = new PDO($dsn, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
      ]);

      // Criar tabelas básicas se não existirem
      $conn->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )");

      $conn->exec("CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date DATETIME,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )");

      // Inserir usuário padrão se não existir
      $stmt = $conn->prepare("SELECT COUNT(*) FROM users WHERE email = 'admin@produtivus.local'");
      $stmt->execute();
      if ($stmt->fetchColumn() == 0) {
        $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        $stmt->execute(['Admin', 'admin@produtivus.local', password_hash('admin123', PASSWORD_DEFAULT)]);
      }
    } else {
      // Configuração MySQL
      $dsn = "mysql:host=$host;dbname=$db_name;charset=utf8mb4";
      if ($port && $port != 3306) {
        $dsn = "mysql:host=$host;port=$port;dbname=$db_name;charset=utf8mb4";
      }

      $conn = new PDO(
        $dsn,
        $username,
        $password,
        [
          PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
          PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
          PDO::ATTR_EMULATE_PREPARES => false,
        ]
      );
    }
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
}
?>
