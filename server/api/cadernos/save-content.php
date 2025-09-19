<?php
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se o usuário está logado
$userId = 1; // ID do usuário padrão

try {
    // Ler dados JSON do body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['page_id']) || !isset($input['content'])) {
        throw new Exception('Dados incompletos: page_id e content são obrigatórios');
    }

    $pageId = $input['page_id'];
    $content = $input['content'];
    $format = $input['format'] ?? 'html';

    error_log("💾 Salvando conteúdo para página: $pageId (formato: $format)");

    // Primeiro, tentar salvar no MySQL
    try {
        require_once __DIR__ . '/../../config/database.php';

        // Verificar se já existe um registro para esta página
        $stmt = $conn->prepare("SELECT id FROM notebook_contents WHERE notebook_id = ? AND user_id = ?");
        $stmt->execute([$pageId, $userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Atualizar conteúdo existente
            $stmt = $conn->prepare("
                UPDATE notebook_contents
                SET content = ?, format = ?, updated_at = CURRENT_TIMESTAMP
                WHERE notebook_id = ? AND user_id = ?
            ");
            $stmt->execute([$content, $format, $pageId, $userId]);
            error_log("✅ Conteúdo atualizado no MySQL para página: $pageId");
        } else {
            // Inserir novo conteúdo
            $stmt = $conn->prepare("
                INSERT INTO notebook_contents (notebook_id, user_id, content, format, created_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([$pageId, $userId, $content, $format]);
            error_log("✅ Novo conteúdo inserido no MySQL para página: $pageId");
        }

        echo json_encode([
            'success' => true,
            'message' => 'Conteúdo salvo no MySQL',
            'page_id' => $pageId,
            'format' => $format,
            'source' => 'mysql_database'
        ]);

    } catch (Exception $mysqlError) {
        // MySQL falhou, tentar SQLite
        try {
            require_once __DIR__ . '/../../config/database_sqlite.php';

            // Verificar se já existe um registro para esta página
            $stmt = $conn->prepare("SELECT id FROM notebook_contents WHERE notebook_id = ? AND user_id = ?");
            $stmt->execute([$pageId, $userId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Atualizar conteúdo existente
                $stmt = $conn->prepare("
                    UPDATE notebook_contents
                    SET content = ?, format = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE notebook_id = ? AND user_id = ?
                ");
                $stmt->execute([$content, $format, $pageId, $userId]);
                error_log("✅ Conteúdo atualizado no SQLite para página: $pageId");
            } else {
                // Inserir novo conteúdo
                $stmt = $conn->prepare("
                    INSERT INTO notebook_contents (notebook_id, user_id, content, format, created_at, updated_at)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ");
                $stmt->execute([$pageId, $userId, $content, $format]);
                error_log("✅ Novo conteúdo inserido no SQLite para página: $pageId");
            }

            echo json_encode([
                'success' => true,
                'message' => 'Conteúdo salvo no SQLite (MySQL indisponível)',
                'page_id' => $pageId,
                'format' => $format,
                'source' => 'sqlite_database'
            ]);

        } catch (Exception $sqliteError) {
            // Ambos falharam
            echo json_encode([
                'success' => false,
                'message' => 'Erro ao salvar: MySQL e SQLite indisponíveis',
                'mysql_error' => $mysqlError->getMessage(),
                'sqlite_error' => $sqliteError->getMessage()
            ]);
        }
    }

} catch (Exception $e) {
    error_log("Erro ao salvar conteúdo: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
