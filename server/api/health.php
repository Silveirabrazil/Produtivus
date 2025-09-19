<?php
/**
 * Health Check Endpoint para Produtivus
 * Verifica status da aplicação, banco de dados e recursos
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

try {
    $health = [
        'status' => 'healthy',
        'timestamp' => date('c'),
        'version' => '3.0.0',
        'environment' => getEnvironment(),
        'checks' => []
    ];

    // 1. Verificar PHP
    $health['checks']['php'] = [
        'status' => 'healthy',
        'version' => PHP_VERSION,
        'extensions' => checkPhpExtensions()
    ];

    // 2. Verificar Banco de Dados
    $dbCheck = checkDatabase();
    $health['checks']['database'] = $dbCheck;
    if ($dbCheck['status'] === 'unhealthy') {
        $health['status'] = 'unhealthy';
    }

    // 3. Verificar Disco
    $diskCheck = checkDiskSpace();
    $health['checks']['disk'] = $diskCheck;
    if ($diskCheck['status'] === 'warning' && $health['status'] === 'healthy') {
        $health['status'] = 'warning';
    }

    // 4. Verificar Sessões
    $sessionCheck = checkSession();
    $health['checks']['session'] = $sessionCheck;

    // 5. Verificar Arquivos Críticos
    $filesCheck = checkCriticalFiles();
    $health['checks']['files'] = $filesCheck;
    if ($filesCheck['status'] === 'unhealthy') {
        $health['status'] = 'unhealthy';
    }

    // 6. Performance/Métricas
    $health['metrics'] = [
        'memory_usage' => [
            'current' => memory_get_usage(true),
            'peak' => memory_get_peak_usage(true),
            'limit' => ini_get('memory_limit')
        ],
        'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
    ];

    // Status HTTP baseado no resultado
    if ($health['status'] === 'unhealthy') {
        http_response_code(503); // Service Unavailable
    } elseif ($health['status'] === 'warning') {
        http_response_code(200); // OK mas com avisos
    } else {
        http_response_code(200); // OK
    }

    echo json_encode($health, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Health check failed',
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ]);
}

function getEnvironment() {
    if (isset($_SERVER['HTTP_HOST'])) {
        $host = $_SERVER['HTTP_HOST'];
        if (strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false) {
            return 'development';
        } elseif (strpos($host, '.dev') !== false || strpos($host, 'staging') !== false) {
            return 'staging';
        }
    }
    return 'production';
}

function checkPhpExtensions() {
    $required = ['pdo', 'pdo_mysql', 'json', 'session'];
    $status = [];

    foreach ($required as $ext) {
        $status[$ext] = extension_loaded($ext);
    }

    return $status;
}

function checkDatabase() {
    try {
        require_once __DIR__ . '/../config/database.php';

        if (!isset($conn) || !($conn instanceof PDO)) {
            return [
                'status' => 'unhealthy',
                'message' => 'Database connection not available'
            ];
        }

        // Teste simples de conexão
        $stmt = $conn->query('SELECT 1 as test');
        $result = $stmt->fetch();

        if ($result['test'] != 1) {
            return [
                'status' => 'unhealthy',
                'message' => 'Database query failed'
            ];
        }

        // Verificar tabelas principais
        $tables = ['users', 'tasks', 'subtasks'];
        $missingTables = [];

        foreach ($tables as $table) {
            try {
                $conn->query("SELECT 1 FROM $table LIMIT 1");
            } catch (PDOException $e) {
                $missingTables[] = $table;
            }
        }

        if (!empty($missingTables)) {
            return [
                'status' => 'unhealthy',
                'message' => 'Missing tables: ' . implode(', ', $missingTables)
            ];
        }

        // Contar registros básicos
        $userCount = $conn->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $taskCount = $conn->query('SELECT COUNT(*) FROM tasks')->fetchColumn();

        return [
            'status' => 'healthy',
            'connection' => 'ok',
            'tables' => 'ok',
            'counts' => [
                'users' => (int)$userCount,
                'tasks' => (int)$taskCount
            ]
        ];

    } catch (Exception $e) {
        return [
            'status' => 'unhealthy',
            'message' => 'Database error: ' . $e->getMessage()
        ];
    }
}

function checkDiskSpace() {
    $freeSpace = disk_free_space('.');
    $totalSpace = disk_total_space('.');

    if ($freeSpace === false || $totalSpace === false) {
        return [
            'status' => 'unknown',
            'message' => 'Cannot determine disk space'
        ];
    }

    $freePercent = ($freeSpace / $totalSpace) * 100;

    if ($freePercent < 5) {
        return [
            'status' => 'unhealthy',
            'free_space' => formatBytes($freeSpace),
            'free_percent' => round($freePercent, 2),
            'message' => 'Critical: Low disk space'
        ];
    } elseif ($freePercent < 15) {
        return [
            'status' => 'warning',
            'free_space' => formatBytes($freeSpace),
            'free_percent' => round($freePercent, 2),
            'message' => 'Warning: Low disk space'
        ];
    }

    return [
        'status' => 'healthy',
        'free_space' => formatBytes($freeSpace),
        'free_percent' => round($freePercent, 2)
    ];
}

function checkSession() {
    try {
        $sessionStatus = session_status();

        return [
            'status' => 'healthy',
            'session_status' => $sessionStatus,
            'session_active' => $sessionStatus === PHP_SESSION_ACTIVE,
            'save_path' => session_save_path()
        ];
    } catch (Exception $e) {
        return [
            'status' => 'unhealthy',
            'message' => 'Session error: ' . $e->getMessage()
        ];
    }
}

function checkCriticalFiles() {
    $critical = [
        'index.html',
        'server/config/database.php',
        'server/api/_auth_guard.php',
        'js/modules/error-handler.js'
    ];

    $missing = [];
    foreach ($critical as $file) {
        if (!file_exists(__DIR__ . '/../../' . $file)) {
            $missing[] = $file;
        }
    }

    if (!empty($missing)) {
        return [
            'status' => 'unhealthy',
            'missing_files' => $missing
        ];
    }

    return [
        'status' => 'healthy',
        'checked_files' => count($critical)
    ];
}

function formatBytes($size, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
        $size /= 1024;
    }

    return round($size, $precision) . ' ' . $units[$i];
}
?>
