<?php
function getDatabaseConnection() {
    // Carregar configuração do banco
    $configFile = __DIR__ . '/../../config/db.json';

    if (!file_exists($configFile)) {
        error_log("❌ Arquivo de configuração não encontrado: " . $configFile);
        throw new Exception('Arquivo de configuração do banco não encontrado');
    }

    $config = json_decode(file_get_contents($configFile), true);

    if (!$config) {
        error_log("❌ Erro ao ler configuração do banco de dados");
        throw new Exception('Erro ao ler configuração do banco de dados');
    }

    $host = $config['host'] ?? 'localhost';
    $dbname = $config['name'] ?? 'produtivus';
    $username = $config['user'] ?? 'root';
    $password = $config['pass'] ?? '';

    error_log("🔧 Configuração do banco: host=$host, dbname=$dbname, username=$username");

    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        error_log("✅ Conexão PDO estabelecida com sucesso");
        return $pdo;
    } catch (PDOException $e) {
        error_log("❌ Erro de conexão PDO: " . $e->getMessage());
        throw new Exception('Falha na conexão com o banco de dados: ' . $e->getMessage());
    }
}

function ensureGuestUser($pdo, $userId) {
    if ($userId == 1) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = 1");
        $stmt->execute();
        if (!$stmt->fetch()) {
            // Criar usuário guest se não existir
            error_log("👤 Criando usuário guest...");
            $stmt = $pdo->prepare("INSERT INTO users (id, name, email, password) VALUES (1, 'Guest User', 'guest@produtivus.local', 'guest123') ON DUPLICATE KEY UPDATE name = name");
            $stmt->execute();
            error_log("✅ Usuário guest criado/verificado");
        }
    }
}

function normalizeUserId($userId) {
    // Converter 'guest' para ID numérico
    return ($userId === 'guest') ? 1 : $userId;
}
?>
