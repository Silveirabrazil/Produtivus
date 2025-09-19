<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// Só aceita POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit();
}

try {
    $input = file_get_contents('php://input');
    $errorData = json_decode($input, true);

    if (!$errorData) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
        exit();
    }

    // Sanitizar dados
    $logEntry = [
        'timestamp' => date('c'),
        'type' => sanitizeString($errorData['type'] ?? 'unknown'),
        'message' => sanitizeString($errorData['message'] ?? ''),
        'url' => sanitizeString($errorData['url'] ?? ''),
        'userAgent' => sanitizeString($errorData['userAgent'] ?? ''),
        'filename' => sanitizeString($errorData['filename'] ?? ''),
        'line' => (int)($errorData['line'] ?? 0),
        'column' => (int)($errorData['column'] ?? 0),
        'stack' => sanitizeString($errorData['stack'] ?? ''),
        'endpoint' => sanitizeString($errorData['endpoint'] ?? ''),
        'attempt' => (int)($errorData['attempt'] ?? 0),
        'session_id' => session_id(),
        'user_id' => $_SESSION['user_id'] ?? null
    ];

    // Log para arquivo
    logError($logEntry);

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    error_log('Error in log_error.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno']);
}

function sanitizeString($input) {
    if (!is_string($input)) return '';
    // Remove caracteres perigosos e limita tamanho
    $cleaned = htmlspecialchars(strip_tags($input), ENT_QUOTES, 'UTF-8');
    return substr($cleaned, 0, 1000); // Limita a 1000 chars
}

function logError($logEntry) {
    $logDir = __DIR__ . '/../logs';

    // Criar diretório se não existir
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/frontend-errors-' . date('Y-m-d') . '.log';
    $logLine = json_encode($logEntry) . PHP_EOL;

    // Escrever log de forma thread-safe
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);

    // Limpar logs antigos (manter apenas 30 dias)
    cleanOldLogs($logDir);
}

function cleanOldLogs($logDir) {
    $cutoffDate = strtotime('-30 days');
    $files = glob($logDir . '/frontend-errors-*.log');

    foreach ($files as $file) {
        if (filemtime($file) < $cutoffDate) {
            @unlink($file);
        }
    }
}
?>
