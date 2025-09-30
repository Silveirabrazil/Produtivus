<?php
// Arquivo de diagnóstico simples para verificar se a API está funcionando
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$response = [
    'success' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'checks' => []
];

// Teste 1: Sessão
try {
    session_start();
    $response['checks']['session'] = [
        'status' => 'ok',
        'session_id' => session_id(),
        'session_status' => session_status()
    ];
} catch (Exception $e) {
    $response['checks']['session'] = [
        'status' => 'error',
        'error' => $e->getMessage()
    ];
}

// Teste 2: Database
try {
    require_once __DIR__ . '/../config/database.php';
    $response['checks']['database'] = [
        'status' => 'ok',
        'connection' => 'Connected to SQLite'
    ];

    // Teste simples de query
    $result = $conn->query("SELECT COUNT(*) as count FROM users")->fetch();
    $response['checks']['database']['user_count'] = $result['count'];

} catch (Exception $e) {
    $response['checks']['database'] = [
        'status' => 'error',
        'error' => $e->getMessage()
    ];
}

// Teste 3: Arquivos necessários
$files = [
    '_session_bootstrap.php',
    '_auth_guard.php',
    '../config/database.php',
    '../../config/app.php'
];

$response['checks']['files'] = [];
foreach ($files as $file) {
    $fullPath = __DIR__ . '/' . $file;
    $response['checks']['files'][$file] = [
        'exists' => file_exists($fullPath),
        'readable' => file_exists($fullPath) && is_readable($fullPath)
    ];
}

// Teste 4: Variáveis de ambiente/sessão
$response['checks']['environment'] = [
    'session_started' => session_status() === PHP_SESSION_ACTIVE,
    'user_id_in_session' => isset($_SESSION['user_id']),
    'user_id_value' => $_SESSION['user_id'] ?? null
];

echo json_encode($response, JSON_PRETTY_PRINT);
?>
