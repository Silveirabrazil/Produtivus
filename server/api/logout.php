<?php
// server/api/logout.php - Endpoint seguro para logout
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
require_once __DIR__ . '/_session_bootstrap.php';

// Carrega configuração
require_once __DIR__ . '/../../config/app.php';

// Função para log de logout
function logLogout($reason, $userId = null) {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'user_id' => $userId,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'reason' => $reason,
        'session_id' => session_id()
    ];

    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/logout.log';
    $logLine = json_encode($logData) . PHP_EOL;
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
}

try {
    $userId = $_SESSION['user_id'] ?? null;
    $reason = 'manual';

    // Obtém motivo do logout se fornecido
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (is_array($input) && isset($input['reason'])) {
            $reason = substr(trim($input['reason']), 0, 50); // Limita tamanho
        }
    }

    // Log do logout
    logLogout($reason, $userId);

    // Destroi a sessão completamente
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'], $params['secure'], $params['httponly']
        );
    }

    session_destroy();

    // Força regeneração de ID de sessão
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
        session_regenerate_id(true);
        session_destroy();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Logout realizado com sucesso',
        'redirect' => 'index.html?logout=1&reason=' . urlencode($reason)
    ]);

} catch (Exception $e) {
    error_log("Erro no logout: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
