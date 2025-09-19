<?php
echo "<h2>🔍 Diagnóstico de Banco de Dados</h2>";
echo "<div style='font-family: monospace; background: #f5f5f5; padding: 20px; border-radius: 8px;'>";

// Testar MySQL primeiro
echo "<h3>📊 MySQL</h3>";
try {
    $cfgFile = __DIR__ . '/config/db.json';
    if (file_exists($cfgFile)) {
        $cfg = json_decode(file_get_contents($cfgFile), true);
        echo "✅ Arquivo de configuração encontrado<br>";
        echo "Host: " . ($cfg['host'] ?? 'N/A') . "<br>";
        echo "Database: " . ($cfg['name'] ?? 'N/A') . "<br>";
        echo "User: " . ($cfg['user'] ?? 'N/A') . "<br>";

        // Tentar conectar
        $host = $cfg['host'] ?? 'localhost';
        $dbname = $cfg['name'] ?? '';
        $username = $cfg['user'] ?? '';
        $password = $cfg['pass'] ?? '';

        $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        echo "✅ <strong>Conexão MySQL bem-sucedida!</strong><br>";

        // Verificar tabelas
        $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "📋 Tabelas encontradas: " . implode(', ', $tables) . "<br>";

        // Verificar cadernos
        if (in_array('notebooks', $tables)) {
            $count = $conn->query("SELECT COUNT(*) FROM notebooks")->fetchColumn();
            echo "📚 Cadernos encontrados: <strong>$count</strong><br>";

            if ($count > 0) {
                $notebooks = $conn->query("SELECT id, title, created_at FROM notebooks LIMIT 5")->fetchAll();
                echo "<div style='margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #28a745;'>";
                foreach ($notebooks as $nb) {
                    echo "• ID: {$nb['id']} - {$nb['title']} ({$nb['created_at']})<br>";
                }
                echo "</div>";
            }
        }

    } else {
        echo "❌ Arquivo de configuração não encontrado<br>";
    }

} catch (Exception $e) {
    echo "❌ Erro MySQL: " . $e->getMessage() . "<br>";
}

echo "<hr>";

// Testar SQLite
echo "<h3>💾 SQLite</h3>";
try {
    $sqliteDbPath = __DIR__ . '/data/produtivus.sqlite';
    echo "Caminho: $sqliteDbPath<br>";

    if (file_exists($sqliteDbPath)) {
        echo "✅ Arquivo SQLite existe<br>";
        $size = filesize($sqliteDbPath);
        echo "Tamanho: " . number_format($size) . " bytes<br>";
    } else {
        echo "⚠️ Arquivo SQLite não existe, será criado<br>";
    }

    $conn = new PDO("sqlite:$sqliteDbPath");
    echo "✅ <strong>Conexão SQLite bem-sucedida!</strong><br>";

    // Verificar tabelas
    $tables = $conn->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Tabelas encontradas: " . implode(', ', $tables) . "<br>";

    // Verificar cadernos
    if (in_array('notebooks', $tables)) {
        $count = $conn->query("SELECT COUNT(*) FROM notebooks")->fetchColumn();
        echo "📚 Cadernos encontrados: <strong>$count</strong><br>";

        if ($count > 0) {
            $notebooks = $conn->query("SELECT id, title, created_at FROM notebooks LIMIT 5")->fetchAll();
            echo "<div style='margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #007bff;'>";
            foreach ($notebooks as $nb) {
                echo "• ID: {$nb['id']} - {$nb['title']} ({$nb['created_at']})<br>";
            }
            echo "</div>";
        }
    }

} catch (Exception $e) {
    echo "❌ Erro SQLite: " . $e->getMessage() . "<br>";
}

echo "</div>";

echo "<h3>🎯 Recomendação</h3>";
echo "<div style='padding: 15px; background: #e3f2fd; border-radius: 8px; margin: 10px 0;'>";
echo "Para ter acesso aos seus cadernos salvos anteriormente:<br>";
echo "1. ✅ Configure um servidor MySQL (XAMPP recomendado)<br>";
echo "2. ✅ Importe o schema do banco (server/schema.sql)<br>";
echo "3. ✅ Configure as credenciais em server/config/db.json<br>";
echo "4. 🔄 Ou use o SQLite para novos dados locais<br>";
echo "</div>";
?>
