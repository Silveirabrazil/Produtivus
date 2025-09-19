<?php
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');

echo "=== DIAGNÓSTICO PRODUTIVUS ===\n";
echo "Data/Hora: " . date('Y-m-d H:i:s') . "\n\n";

// 1) PHP & Extensões
echo "--- PHP & EXTENSÕES ---\n";
echo "✅ PHP: " . PHP_VERSION . "\n";
echo "PDO: " . (extension_loaded('pdo') ? '✅ Sim' : '❌ Não') . "\n";
echo "pdo_mysql: " . (in_array('mysql', class_exists('PDO') ? PDO::getAvailableDrivers() : [], true) ? '✅ Sim' : '❌ Não') . "\n\n";

// 2) Arquivos críticos do frontend/backend
echo "--- ARQUIVOS ---\n";
$files = [
    'index.html' => __DIR__ . '/index.html',
    'tarefas.html' => __DIR__ . '/tarefas.html',
    'cadernos.html' => __DIR__ . '/cadernos.html',
    'mapas.html' => __DIR__ . '/mapas.html',
    'css/styles.css' => __DIR__ . '/css/styles.css',
    // 'js/modules/load-components.js' => __DIR__ . '/js/modules/load-components.js', // deprecated
    'server/api/notebooks.php' => __DIR__ . '/server/api/notebooks.php',
    'server/api/notebook_pages.php' => __DIR__ . '/server/api/notebook_pages.php',
    'server/api/subjects.php' => __DIR__ . '/server/api/subjects.php',
    'server/api/courses.php' => __DIR__ . '/server/api/courses.php',
    'server/api/login.php' => __DIR__ . '/server/api/login.php',
    'server/api/account.php' => __DIR__ . '/server/api/account.php',
    'server/api/health.php' => __DIR__ . '/server/api/health.php',
    'apps/mindmaps/dist/index.html' => __DIR__ . '/apps/mindmaps/dist/index.html',
    'apps/mindmaps/dist/.vite/manifest.json' => __DIR__ . '/apps/mindmaps/dist/.vite/manifest.json',
    // Sheets app (Planilhas)
    'apps/sheets/dist/index.html' => __DIR__ . '/apps/sheets/dist/index.html',
    'apps/sheets/dist/.vite/manifest.json' => __DIR__ . '/apps/sheets/dist/.vite/manifest.json',
    'apps/sheets/dist/manifest.json' => __DIR__ . '/apps/sheets/dist/manifest.json',
    'apps/sheets/dist/assets/style.css' => __DIR__ . '/apps/sheets/dist/assets/style.css',
    'apps/sheets/dist/assets/app.js' => __DIR__ . '/apps/sheets/dist/assets/app.js',
];
foreach ($files as $name => $path) {
    if (file_exists($path)) {
    $size = filesize($path);
    $human = $size < 1024 ? $size.' B' : ($size < 1048576 ? round($size/1024,2).' KB' : round($size/1048576,2).' MB');
    echo "✅ $name: ${size} bytes (${human})\n";
    } else {
        echo "❌ $name: NÃO ENCONTRADO\n";
    }
}
echo "\n";

// 3) Saúde do servidor e DB
echo "--- HEALTH & DB ---\n";
try {
    ob_start();
    include __DIR__ . '/server/api/health.php';
    $out = ob_get_clean();
    $h = json_decode($out, true);
    if (is_array($h)) {
        echo "health.ok: " . (!empty($h['ok']) ? '✅' : '❌') . "\n";
        echo "php: " . ($h['php'] ?? '-') . "\n";
        echo "db: " . (!empty($h['db']) ? '✅' : '❌') . (isset($h['db_error']) ? (' ('.$h['db_error'].')') : '') . "\n";
    } else {
        echo "❌ health.php retornou inválido\n";
    }
} catch (Throwable $e) {
    echo "❌ Falha ao carregar health.php: " . $e->getMessage() . "\n";
}

// 4) Sessão (sem incluir APIs que fazem exit)
echo "\n--- SESSÃO & CONTA ---\n";
try {
    require_once __DIR__ . '/server/api/_session_bootstrap.php';
    if (!empty($_SESSION['user_id'])) {
        $name = $_SESSION['user_name'] ?? '-';
        $email = $_SESSION['user_email'] ?? '-';
        echo "Sessão: ✅\n";
        echo "Usuário: $name <$email>\n";
    } else {
        echo "Sessão: ❌ (não autenticado)\n";
    }
} catch (Throwable $e) {
    echo "Sessão: ❌ erro - " . $e->getMessage() . "\n";
}

// 5) Dados (contagens) diretamente do DB (sem passar por APIs protegidas)
echo "\n--- DADOS (DB) ---\n";
try {
    // tentar MySQL; se falhar, tentar SQLite
    $conn = null; $source = '';
    try {
        @require __DIR__ . '/server/config/database.php';
        if (isset($conn)) $source = 'mysql';
    } catch (Throwable $e) {}
    if (!$conn) {
        try { @require __DIR__ . '/server/config/database_sqlite.php'; if (isset($conn)) $source = 'sqlite'; } catch (Throwable $e) {}
    }
    if ($conn instanceof PDO) {
        $c1 = (int)($conn->query('SELECT COUNT(*) FROM notebooks')->fetchColumn());
        $c2 = (int)($conn->query('SELECT COUNT(*) FROM notebook_pages')->fetchColumn());
        $u  = (int)($conn->query('SELECT COUNT(*) FROM users')->fetchColumn());
        echo "Fonte: $source\n";
        echo "users: $u\n";
        echo "notebooks: $c1\n";
        echo "pages: $c2\n";
    } else {
        echo "❌ Sem conexão DB para contagens\n";
    }
} catch (Throwable $e) {
    echo "❌ Erro ao consultar DB: " . $e->getMessage() . "\n";
}

// 6) URLs úteis
echo "\n--- ROTAS & URLs ---\n";
$protocol = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = rtrim(dirname($_SERVER['REQUEST_URI'] ?? '/'), '/');
$baseUrl = $protocol . '://' . $host . ($basePath ?: '');
echo "🌐 Base: $baseUrl\n";
echo "� Health: $baseUrl/server/api/health.php\n";
echo "� Account: $baseUrl/server/api/account.php\n";
echo "📒 Notebooks: $baseUrl/server/api/notebooks.php\n";
echo "🗂️ Pages: $baseUrl/server/api/notebook_pages.php\n";
echo "🧭 Mindmaps manifest: $baseUrl/apps/mindmaps/dist/.vite/manifest.json\n";
echo "🧮 Sheets manifest (.vite): $baseUrl/apps/sheets/dist/.vite/manifest.json\n";
echo "🧮 Sheets CSS: $baseUrl/apps/sheets/dist/assets/style.css\n";
echo "🧮 Sheets JS: $baseUrl/apps/sheets/dist/assets/app.js\n";

echo "\n=== FIM DO DIAGNÓSTICO ===\n";
?>
