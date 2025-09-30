<?php
/**
 * Configuração segura do Produtivus
 * Este arquivo deve estar fora do webroot
 */

// Carrega bootstrap se não foi carregado ainda
if (!defined('PRODUTIVUS_ENV')) {
    require_once __DIR__ . '/bootstrap.php';
}

if (!defined('PRODUTIVUS_CONFIG_LOADED')) {
    define('PRODUTIVUS_CONFIG_LOADED', true);

    // Configuração do banco de dados
    class DatabaseConfig {
        public static function get() {
            // Primeiro tenta variáveis de ambiente
            if (getenv('DB_HOST')) {
                return [
                    'host' => getenv('DB_HOST'),
                    'name' => getenv('DB_NAME'),
                    'user' => getenv('DB_USER'),
                    'pass' => getenv('DB_PASS'),
                    'port' => getenv('DB_PORT') ?: 3306
                ];
            }

            // Fallback para arquivo JSON (desenvolvimento)
            $legacyFile = __DIR__ . '/../server/config/db.json';
            if (file_exists($legacyFile)) {
                $config = json_decode(file_get_contents($legacyFile), true);
                if ($config) {
                    return $config;
                }
            }

            // Configuração padrão para desenvolvimento
            return [
                'host' => 'localhost',
                'name' => 'produtivus_db',
                'user' => 'root',
                'pass' => '',
                'port' => 3306
            ];
        }
    }

    // Configuração OAuth
    class OAuthConfig {
        public static function get() {
            // Primeiro tenta variáveis de ambiente
            if (getenv('GOOGLE_CLIENT_ID')) {
                return [
                    'googleClientId' => getenv('GOOGLE_CLIENT_ID'),
                    'googleClientSecret' => getenv('GOOGLE_CLIENT_SECRET')
                ];
            }

            // Fallback para arquivo JSON (desenvolvimento)
            $legacyFile = __DIR__ . '/../server/config/oauth.json';
            if (file_exists($legacyFile)) {
                $config = json_decode(file_get_contents($legacyFile), true);
                if ($config) {
                    return $config;
                }
            }

            return [
                'googleClientId' => '',
                'googleClientSecret' => ''
            ];
        }
    }

    // Configuração de IA
    class AIConfig {
        public static function get() {
            // Primeiro tenta variáveis de ambiente
            if (getenv('AI_PROVIDER')) {
                return [
                    'provider' => getenv('AI_PROVIDER'),
                    'azure' => [
                        'endpoint' => getenv('AZURE_OPENAI_ENDPOINT'),
                        'deployment' => getenv('AZURE_OPENAI_DEPLOYMENT'),
                        'apiKey' => getenv('AZURE_OPENAI_API_KEY'),
                        'apiVersion' => getenv('AZURE_OPENAI_API_VERSION') ?: '2024-08-01-preview'
                    ],
                    'openai' => [
                        'baseUrl' => getenv('OPENAI_BASE_URL') ?: 'https://api.openai.com/v1',
                        'apiKey' => getenv('OPENAI_API_KEY'),
                        'model' => getenv('OPENAI_MODEL') ?: 'gpt-4o-mini'
                    ]
                ];
            }

            // Fallback para arquivo JSON (desenvolvimento)
            $legacyFile = __DIR__ . '/../server/config/ai.json';
            if (file_exists($legacyFile)) {
                $config = json_decode(file_get_contents($legacyFile), true);
                if ($config) {
                    return $config;
                }
            }

            return [
                'provider' => 'openai',
                'azure' => [
                    'endpoint' => '',
                    'deployment' => '',
                    'apiKey' => '',
                    'apiVersion' => '2024-08-01-preview'
                ],
                'openai' => [
                    'baseUrl' => 'https://api.openai.com/v1',
                    'apiKey' => '',
                    'model' => 'gpt-4o-mini'
                ]
            ];
        }
    }

    // Configuração de instalação
    class InstallConfig {
        public static function get() {
            // Primeiro tenta variáveis de ambiente
            if (getenv('INSTALL_SECRET')) {
                return [
                    'secret' => getenv('INSTALL_SECRET'),
                    'version' => getenv('APP_VERSION') ?: '3.0.0.0'
                ];
            }

            // Fallback para arquivo JSON (desenvolvimento)
            $legacyFile = __DIR__ . '/../server/config/install.json';
            if (file_exists($legacyFile)) {
                $config = json_decode(file_get_contents($legacyFile), true);
                if ($config) {
                    return $config;
                }
            }

            return [
                'secret' => bin2hex(random_bytes(32)), // Gera um secret aleatório
                'version' => '3.0.0.0'
            ];
        }
    }

    // Configuração de segurança
    class SecurityConfig {
        public static function get() {
            return [
                // Sessão padrão de 12 horas (pode ser alterada por env SESSION_TIMEOUT)
                'session_timeout' => (int) (getenv('SESSION_TIMEOUT') ?: 43200),
                'max_login_attempts' => (int) (getenv('MAX_LOGIN_ATTEMPTS') ?: 5),
                'rate_limit_window' => (int) (getenv('RATE_LIMIT_WINDOW') ?: 300), // 5 minutos
                'rate_limit_max' => (int) (getenv('RATE_LIMIT_MAX') ?: 100),
                'password_min_length' => (int) (getenv('PASSWORD_MIN_LENGTH') ?: 8),
                'enable_csrf' => filter_var(getenv('ENABLE_CSRF') ?: 'true', FILTER_VALIDATE_BOOLEAN),
                'secure_cookies' => filter_var(getenv('SECURE_COOKIES') ?: 'false', FILTER_VALIDATE_BOOLEAN)
            ];
        }
    }

    // Configuração de desenvolvimento
    class DevConfig {
        public static function get() {
            return [
                'debug_mode' => filter_var(getenv('DEBUG_MODE') ?: 'false', FILTER_VALIDATE_BOOLEAN),
                'log_level' => getenv('LOG_LEVEL') ?: 'WARNING',
                'enable_profiling' => filter_var(getenv('ENABLE_PROFILING') ?: 'false', FILTER_VALIDATE_BOOLEAN)
            ];
        }
    }
}
