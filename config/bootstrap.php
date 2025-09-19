<?php
/**
 * Script de inicialização do Produtivus
 * Carrega variáveis de ambiente e configurações
 */

// Define constantes de ambiente
if (!defined('PRODUTIVUS_ENV')) {
    define('PRODUTIVUS_ENV', getenv('PRODUTIVUS_ENV') ?: 'development');
}

if (!defined('PRODUTIVUS_ROOT')) {
    define('PRODUTIVUS_ROOT', dirname(__DIR__));
}

// Função para carregar variáveis de ambiente de arquivo .env
function loadEnvFile($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Ignora comentários
        if (strpos(trim($line), '#') === 0) {
            continue;
        }

        // Parse da linha KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            // Remove aspas se existirem
            if (preg_match('/^"(.*)"$/', $value, $matches)) {
                $value = $matches[1];
            } elseif (preg_match("/^'(.*)'$/", $value, $matches)) {
                $value = $matches[1];
            }

            // Define a variável de ambiente se ainda não estiver definida
            if (!getenv($name)) {
                putenv("$name=$value");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }

    return true;
}

// Tenta carregar arquivo .env na raiz do projeto
$envFile = PRODUTIVUS_ROOT . '/.env';
if (file_exists($envFile)) {
    loadEnvFile($envFile);
}

// Carrega configurações específicas do ambiente
$envConfigFile = PRODUTIVUS_ROOT . '/config/' . PRODUTIVUS_ENV . '.php';
if (file_exists($envConfigFile)) {
    require_once $envConfigFile;
}

// Define configurações padrão de PHP para produção
if (PRODUTIVUS_ENV === 'production') {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    ini_set('log_errors', '1');
    ini_set('error_log', PRODUTIVUS_ROOT . '/logs/php_errors.log');
    error_reporting(E_ALL & ~E_NOTICE & ~E_STRICT & ~E_DEPRECATED);
} else {
    // Configurações de desenvolvimento
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
}

// Configura timezone padrão
date_default_timezone_set('America/Sao_Paulo');

// Define configurações de sessão seguras (apenas se as classes estiverem carregadas)
if (class_exists('SecurityConfig')) {
    if (SecurityConfig::get()['secure_cookies']) {
        ini_set('session.cookie_secure', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');
    }

    // Define timeout de sessão
    ini_set('session.gc_maxlifetime', SecurityConfig::get()['session_timeout']);
}

// Configurações de segurança adicionais
ini_set('expose_php', '0');
header_remove('X-Powered-By');

// Função de log personalizada
if (!function_exists('produtivus_log')) {
    function produtivus_log($message, $level = 'INFO') {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp][$level] $message" . PHP_EOL;

        $logDir = PRODUTIVUS_ROOT . '/logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }

        $logFile = $logDir . '/app.log';
        file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    }
}

// Log de inicialização
if (PRODUTIVUS_ENV === 'development') {
    produtivus_log("Aplicação inicializada - Ambiente: " . PRODUTIVUS_ENV);
}
