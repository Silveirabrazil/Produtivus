#!/usr/bin/env php
<?php
/**
 * Script de atualização automática para aplicar sistema de proteção de rotas
 */

echo "=== Atualizador de Segurança do Produtivus ===\n\n";

$baseDir = __DIR__ . '/../';
$protectedPages = [
    'dashboard.html',
    'tarefas.html',
    'calendario.html',
    'estudos.html',
    'cadernos.html',
    'planilhas.html',
    'mapas.html',
    'subjects.html'
];

$scriptsToAdd = [
    'js/modules/error-handler.js',
    'js/modules/route-guard.js'
];

function addScriptsToPage($filePath, $scriptsToAdd) {
    if (!file_exists($filePath)) {
        echo "⚠️  Arquivo não encontrado: $filePath\n";
        return false;
    }

    $content = file_get_contents($filePath);
    $modified = false;

    foreach ($scriptsToAdd as $script) {
        // Verifica se o script já está incluído
        if (strpos($content, $script) === false) {
            // Procura por uma tag script existente para inserir antes
            $protectJsPattern = '/(<script[^>]*src=["\']js\/protect\.js[^>]*><\/script>)/';

            if (preg_match($protectJsPattern, $content)) {
                // Insere antes do protect.js
                $newScript = "  <script src=\"$script\" defer></script>\n";
                $content = preg_replace($protectJsPattern, $newScript . '$1', $content);
                $modified = true;
                echo "  ✓ Adicionado $script\n";
            } else {
                // Se não encontrar protect.js, procura por outras tags script
                $lastScriptPattern = '/(<script[^>]*src=[^>]*><\/script>)(?!.*<script[^>]*src=)/s';

                if (preg_match($lastScriptPattern, $content)) {
                    $newScript = "  <script src=\"$script\" defer></script>";
                    $content = preg_replace($lastScriptPattern, '$1' . "\n" . $newScript, $content);
                    $modified = true;
                    echo "  ✓ Adicionado $script (fallback)\n";
                }
            }
        } else {
            echo "  ℹ️  $script já incluído\n";
        }
    }

    if ($modified) {
        file_put_contents($filePath, $content);
        return true;
    }

    return false;
}

function updatePageVersions($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }

    $content = file_get_contents($filePath);
    $currentDate = date('YmdHi');

    // Atualiza versões dos scripts de proteção
    $patterns = [
        '/(\?v=)[0-9]{12}/' => '${1}' . $currentDate,
        '/(js\/modules\/error-handler\.js)/' => '${1}?v=' . $currentDate,
        '/(js\/modules\/route-guard\.js)/' => '${1}?v=' . $currentDate,
        '/(js\/protect\.js)/' => '${1}?v=' . $currentDate
    ];

    $modified = false;
    foreach ($patterns as $pattern => $replacement) {
        if (preg_match($pattern, $content)) {
            $content = preg_replace($pattern, $replacement, $content);
            $modified = true;
        }
    }

    if ($modified) {
        file_put_contents($filePath, $content);
        return true;
    }

    return false;
}

// Aplica atualizações às páginas protegidas
echo "Atualizando páginas protegidas...\n";
foreach ($protectedPages as $page) {
    $filePath = $baseDir . $page;
    echo "\n📄 Processando $page:\n";

    $scriptsAdded = addScriptsToPage($filePath, $scriptsToAdd);
    $versionsUpdated = updatePageVersions($filePath);

    if ($scriptsAdded || $versionsUpdated) {
        echo "  ✅ Página atualizada com sucesso!\n";
    } else {
        echo "  ℹ️  Nenhuma alteração necessária\n";
    }
}

// Verifica se todas as páginas têm protect.js
echo "\n🔍 Verificando cobertura de proteção...\n";
foreach ($protectedPages as $page) {
    $filePath = $baseDir . $page;
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        if (strpos($content, 'protect.js') === false) {
            echo "⚠️  $page não possui protect.js - ATENÇÃO!\n";
        } else {
            echo "✅ $page protegido\n";
        }
    }
}

// Cria arquivo de configuração para debug se não existir
$devConfigPath = $baseDir . 'server/config/dev.json';
if (!file_exists($devConfigPath)) {
    echo "\n🔧 Criando configuração de desenvolvimento...\n";
    $devConfig = [
        'devAuth' => [
            'enabled' => false,
            'force' => false,
            'user' => [
                'id' => 1,
                'name' => 'Dev User',
                'email' => 'dev@produtivus.local'
            ]
        ]
    ];

    $configDir = dirname($devConfigPath);
    if (!is_dir($configDir)) {
        mkdir($configDir, 0755, true);
    }

    file_put_contents($devConfigPath, json_encode($devConfig, JSON_PRETTY_PRINT));
    echo "✅ Configuração de desenvolvimento criada: $devConfigPath\n";
}

echo "\n=== Atualização Concluída ===\n";
echo "🛡️  Sistema de proteção de rotas aprimorado!\n";
echo "🔄 Verificação contínua de sessão ativada\n";
echo "📊 Logs de segurança habilitados\n";
echo "⚡ Redirecionamento automático para login implementado\n\n";

echo "⚠️  IMPORTANTE:\n";
echo "- Teste o sistema em desenvolvimento antes de usar em produção\n";
echo "- Configure as variáveis de ambiente (.env) adequadamente\n";
echo "- Monitore os logs em logs/unauthorized_access.log e logs/logout.log\n";
echo "- Ajuste os intervalos de verificação conforme necessário\n\n";

echo "🎉 Sistema de segurança atualizado com sucesso!\n";
