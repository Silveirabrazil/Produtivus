#!/usr/bin/env php
<?php
/**
 * Script de migração para nova estrutura de configuração
 * Converte arquivos JSON existentes para variáveis de ambiente
 */

require_once __DIR__ . '/app.php';

echo "=== Migração de Configuração do Produtivus ===\n\n";

$envLines = [
    "# Configuração do Produtivus",
    "# Arquivo gerado automaticamente pela migração",
    ""
];

// Migra configuração do banco de dados
$dbFile = __DIR__ . '/../server/config/db.json';
if (file_exists($dbFile)) {
    echo "✓ Migrando configuração do banco de dados...\n";
    $dbConfig = json_decode(file_get_contents($dbFile), true);
    if ($dbConfig) {
        $envLines[] = "# Configuração do Banco de Dados";
        $envLines[] = "DB_HOST=" . ($dbConfig['host'] ?? 'localhost');
        $envLines[] = "DB_NAME=" . ($dbConfig['name'] ?? 'produtivus_db');
        $envLines[] = "DB_USER=" . ($dbConfig['user'] ?? 'root');
        $envLines[] = "DB_PASS=" . ($dbConfig['pass'] ?? '');
        $envLines[] = "DB_PORT=" . ($dbConfig['port'] ?? '3306');
        $envLines[] = "";
    }
}

// Migra configuração OAuth
$oauthFile = __DIR__ . '/../server/config/oauth.json';
if (file_exists($oauthFile)) {
    echo "✓ Migrando configuração OAuth...\n";
    $oauthConfig = json_decode(file_get_contents($oauthFile), true);
    if ($oauthConfig) {
        $envLines[] = "# Configuração OAuth (Google)";
        $envLines[] = "GOOGLE_CLIENT_ID=" . ($oauthConfig['googleClientId'] ?? '');
        $envLines[] = "GOOGLE_CLIENT_SECRET=" . ($oauthConfig['googleClientSecret'] ?? '');
        $envLines[] = "";
    }
}

// Migra configuração de IA
$aiFile = __DIR__ . '/../server/config/ai.json';
if (file_exists($aiFile)) {
    echo "✓ Migrando configuração de IA...\n";
    $aiConfig = json_decode(file_get_contents($aiFile), true);
    if ($aiConfig) {
        $envLines[] = "# Configuração de IA";
        $envLines[] = "AI_PROVIDER=" . ($aiConfig['provider'] ?? 'openai');

        if (isset($aiConfig['azure'])) {
            $envLines[] = "AZURE_OPENAI_ENDPOINT=" . ($aiConfig['azure']['endpoint'] ?? '');
            $envLines[] = "AZURE_OPENAI_DEPLOYMENT=" . ($aiConfig['azure']['deployment'] ?? '');
            $envLines[] = "AZURE_OPENAI_API_KEY=" . ($aiConfig['azure']['apiKey'] ?? '');
            $envLines[] = "AZURE_OPENAI_API_VERSION=" . ($aiConfig['azure']['apiVersion'] ?? '2024-08-01-preview');
        }

        if (isset($aiConfig['openai'])) {
            $envLines[] = "OPENAI_BASE_URL=" . ($aiConfig['openai']['baseUrl'] ?? 'https://api.openai.com/v1');
            $envLines[] = "OPENAI_API_KEY=" . ($aiConfig['openai']['apiKey'] ?? '');
            $envLines[] = "OPENAI_MODEL=" . ($aiConfig['openai']['model'] ?? 'gpt-4o-mini');
        }

        $envLines[] = "";
    }
}

// Migra configuração de instalação
$installFile = __DIR__ . '/../server/config/install.json';
if (file_exists($installFile)) {
    echo "✓ Migrando configuração de instalação...\n";
    $installConfig = json_decode(file_get_contents($installFile), true);
    if ($installConfig) {
        $envLines[] = "# Configuração de Instalação";
        $envLines[] = "INSTALL_SECRET=" . ($installConfig['secret'] ?? bin2hex(random_bytes(32)));
        $envLines[] = "APP_VERSION=" . ($installConfig['version'] ?? '3.0.0.0');
        $envLines[] = "";
    }
}

// Adiciona configurações padrão de segurança
$envLines[] = "# Configuração de Segurança";
$envLines[] = "SESSION_TIMEOUT=3600";
$envLines[] = "MAX_LOGIN_ATTEMPTS=5";
$envLines[] = "RATE_LIMIT_WINDOW=300";
$envLines[] = "RATE_LIMIT_MAX=100";
$envLines[] = "PASSWORD_MIN_LENGTH=8";
$envLines[] = "ENABLE_CSRF=true";
$envLines[] = "SECURE_COOKIES=false";
$envLines[] = "";

// Adiciona configurações de desenvolvimento
$envLines[] = "# Configuração de Desenvolvimento";
$envLines[] = "DEBUG_MODE=false";
$envLines[] = "LOG_LEVEL=WARNING";
$envLines[] = "ENABLE_PROFILING=false";
$envLines[] = "PRODUTIVUS_ENV=production";

// Salva arquivo .env
$envContent = implode("\n", $envLines);
$envPath = __DIR__ . '/../.env';

if (file_exists($envPath)) {
    $backup = $envPath . '.backup.' . date('Y-m-d-H-i-s');
    copy($envPath, $backup);
    echo "✓ Backup do .env existente criado: $backup\n";
}

file_put_contents($envPath, $envContent);
echo "✓ Arquivo .env criado/atualizado com sucesso!\n\n";

// Sugere mover arquivos JSON para backup
echo "=== Próximos Passos ===\n";
echo "1. Revise o arquivo .env e ajuste as configurações conforme necessário\n";
echo "2. Considere mover os arquivos JSON para um diretório de backup:\n";
echo "   - server/config/db.json\n";
echo "   - server/config/oauth.json\n";
echo "   - server/config/ai.json\n";
echo "   - server/config/install.json\n\n";

echo "3. Configure as variáveis de ambiente no servidor de produção\n";
echo "4. Teste a aplicação para garantir que tudo está funcionando\n\n";

echo "Migração concluída com sucesso! 🎉\n";
