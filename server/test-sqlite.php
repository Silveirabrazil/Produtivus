<?php
echo "Teste de conexão PHP-SQLite\n";

// Verificar se SQLite está disponível
if (class_exists('PDO')) {
    echo "✅ PDO disponível\n";

    $drivers = PDO::getAvailableDrivers();
    echo "Drivers PDO: " . implode(', ', $drivers) . "\n";

    if (in_array('sqlite', $drivers)) {
        echo "✅ SQLite driver disponível\n";

        // Teste de conexão SQLite
        try {
            $dbPath = __DIR__ . '/data/test.sqlite';
            $conn = new PDO("sqlite:$dbPath");
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            echo "✅ Conexão SQLite criada com sucesso\n";
            echo "Arquivo do banco: $dbPath\n";

            // Criar tabela de teste
            $conn->exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, message TEXT)");
            $conn->exec("INSERT OR REPLACE INTO test (id, message) VALUES (1, 'Conexão funcionando!')");

            $stmt = $conn->query("SELECT * FROM test");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            echo "✅ Dados do teste: " . json_encode($result) . "\n";

        } catch (PDOException $e) {
            echo "❌ Erro SQLite: " . $e->getMessage() . "\n";
        }
    } else {
        echo "❌ SQLite driver não disponível\n";
    }
} else {
    echo "❌ PDO não disponível\n";
}
?>
