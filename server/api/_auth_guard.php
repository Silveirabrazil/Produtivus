<?php
// Include this in protected endpoints to require a logged-in session
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_session_bootstrap.php';

// Carrega configuração de segurança
require_once __DIR__ . '/../../config/app.php';
$securityConfig = SecurityConfig::get();

// Função para log de tentativas de acesso não autorizadas
function logUnauthorizedAccess($reason, $endpoint = null) {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'endpoint' => $endpoint ?? $_SERVER['REQUEST_URI'] ?? 'unknown',
        'reason' => $reason,
        'session_id' => session_id()
    ];

    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logFile = $logDir . '/unauthorized_access.log';
    $logLine = json_encode($logData) . PHP_EOL;
    file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
}

// Função para verificar timeout de sessão
function checkSessionTimeout() {
    global $securityConfig;

    if (isset($_SESSION['last_activity'])) {
        $timeoutDuration = $securityConfig['session_timeout'];
        if (time() - $_SESSION['last_activity'] > $timeoutDuration) {
            logUnauthorizedAccess('session_timeout');
            session_destroy();
            return false;
        }
    }

    $_SESSION['last_activity'] = time();
    return true;
}

// Dev auto-login via server/config/dev.json (apenas em desenvolvimento)
if (!isset($_SESSION['user_id'])) {
  $remote = $_SERVER['REMOTE_ADDR'] ?? '';
  $host = $_SERVER['HTTP_HOST'] ?? '';
  $isLocal = ($remote === '127.0.0.1' || $remote === '::1' || stripos($host, 'localhost') !== false || stripos($host, '127.0.0.1') !== false);
  $cfgPath = __DIR__ . '/../config/dev.json';
  $dev = null;

  // Só permite auto-login em desenvolvimento e ambientes locais
  $devConfig = DevConfig::get();
  if ($devConfig['debug_mode'] && $isLocal && @is_file($cfgPath) && @is_readable($cfgPath)) {
    $raw = @file_get_contents($cfgPath);
    $cfg = @json_decode($raw, true);
    $dev = is_array($cfg) && isset($cfg['devAuth']) ? $cfg['devAuth'] : null;

    if (is_array($dev) && !empty($dev['enabled']) && is_array($dev['user']) && isset($dev['user']['id'])) {
      $force = !empty($dev['force']);
      if ($isLocal || $force) {
        $_SESSION['user_id'] = (int)$dev['user']['id'];
        if (isset($dev['user']['name'])) $_SESSION['user_name'] = (string)$dev['user']['name'];
        if (isset($dev['user']['email'])) $_SESSION['user_email'] = (string)$dev['user']['email'];
        $_SESSION['last_activity'] = time();
        $_SESSION['login_time'] = time();
        $_SESSION['dev_login'] = true;
      }
    }
  }
}

// Verifica se usuário está logado
if (!isset($_SESSION['user_id'])) {
  logUnauthorizedAccess('no_session');
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Não autenticado']);
  exit;
}

// Verifica timeout de sessão
if (!checkSessionTimeout()) {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Sessão expirada']);
  exit;
}

// Verifica se a sessão não foi comprometida (IP checking mais permissivo)
if (!isset($_SESSION['user_ip'])) {
    $_SESSION['user_ip'] = $_SERVER['REMOTE_ADDR'] ?? '';
} else {
    $currentIp = $_SERVER['REMOTE_ADDR'] ?? '';
    // Apenas verifica mudança de IP em produção E se não for ambiente de desenvolvimento
    $devConfig = DevConfig::get();
    if (!$devConfig['debug_mode'] && $_SESSION['user_ip'] !== $currentIp) {
        $isLocalIp = in_array($currentIp, ['127.0.0.1', '::1']) ||
                     strpos($currentIp, '192.168.') === 0 ||
                     strpos($currentIp, '10.') === 0 ||
                     strpos($currentIp, '172.') === 0;

        // Só bloqueia se não for IP local/privado E if a mudança for muito significativa
        if (!$isLocalIp && !isset($_SESSION['ip_change_warned'])) {
            // Primeira mudança - apenas avisa
            $_SESSION['ip_change_warned'] = true;
            $_SESSION['user_ip'] = $currentIp; // Atualiza IP
            error_log("Aviso de mudança de IP - User ID: {$_SESSION['user_id']}, Old: {$_SESSION['user_ip']}, New: $currentIp");
        }
    }
}

// Atualiza timestamp de última atividade
$_SESSION['last_activity'] = time();

// Log de acesso autorizado (apenas em modo debug)
if ($devConfig['debug_mode']) {
    error_log("Acesso autorizado - User ID: {$_SESSION['user_id']}, IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
}
