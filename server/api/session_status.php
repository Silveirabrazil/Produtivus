<?php
// server/api/session_status.php - Endpoint para verificação avançada de sessão
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_session_bootstrap.php';

// Carrega configuração
require_once __DIR__ . '/../../config/app.php';
$securityConfig = SecurityConfig::get();

try {
    $response = ['success' => false, 'authenticated' => false];

    // Verifica se há sessão ativa
    if (isset($_SESSION['user_id'])) {
        // Verifica timeout de sessão
        $timeoutDuration = $securityConfig['session_timeout'];
        $lastActivity = $_SESSION['last_activity'] ?? time();
        $timeRemaining = $timeoutDuration - (time() - $lastActivity);

        if ($timeRemaining <= 0) {
            // Sessão expirada
            session_destroy();
            $response['message'] = 'Sessão expirada';
            $response['reason'] = 'timeout';
        } else {
            // Sessão válida
            $_SESSION['last_activity'] = time();

            $response['success'] = true;
            $response['authenticated'] = true;
            $response['user'] = [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'] ?? '',
                'email' => $_SESSION['user_email'] ?? ''
            ];
            $response['session'] = [
                'time_remaining' => $timeRemaining,
                'last_activity' => $lastActivity,
                'login_time' => $_SESSION['login_time'] ?? $lastActivity,
                'is_dev_login' => $_SESSION['dev_login'] ?? false
            ];

            // Aviso se sessão expira em breve (menos de 5 minutos)
            if ($timeRemaining < 300) {
                $response['warning'] = 'Sessão expira em breve';
                $response['time_remaining_formatted'] = gmdate('i:s', $timeRemaining);
            }
        }
    } else {
        $response['message'] = 'Não autenticado';
        $response['reason'] = 'no_session';
    }

    // Headers de segurança
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    if (!$response['authenticated']) {
        http_response_code(401);
    }

    echo json_encode($response);

} catch (Exception $e) {
    error_log("Erro na verificação de sessão: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
