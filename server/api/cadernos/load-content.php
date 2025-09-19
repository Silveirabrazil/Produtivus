<?php
session_start();
require_once 'db-helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Verificar se o usuário está logado
$userId = normalizeUserId($_SESSION['user_id'] ?? 'guest');
$pageId = $_GET['page_id'] ?? null;

if (!$pageId) {
    echo json_encode([
        'success' => false,
        'error' => 'page_id é obrigatório'
    ]);
    exit();
}

try {
    error_log("📖 Carregando conteúdo para página: $pageId");

    try {
        // Tentar carregar do banco de dados
        $pdo = getDatabaseConnection();

        $stmt = $pdo->prepare("
            SELECT content, format, updated_at
            FROM notebook_contents
            WHERE notebook_id = ? AND user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
        ");
        $stmt->execute([$pageId, $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result) {
            error_log("✅ Conteúdo encontrado no banco para página: $pageId");

            echo json_encode([
                'success' => true,
                'content' => $result['content'],
                'format' => $result['format'],
                'updated_at' => $result['updated_at'],
                'source' => 'database'
            ]);
        } else {
            error_log("ℹ️ Nenhum conteúdo encontrado no banco para página: $pageId");

            echo json_encode([
                'success' => true,
                'content' => '',
                'format' => 'html',
                'updated_at' => null,
                'source' => 'database'
            ]);
        }

    } catch (PDOException $e) {
        // Fallback para arquivo se banco não disponível
        error_log("Banco indisponível, tentando arquivo: " . $e->getMessage());

        $dataDir = __DIR__ . '/../../data';
        $contentFile = $dataDir . "/content_{$userId}_{$pageId}.json";

        if (file_exists($contentFile)) {
            $contentData = json_decode(file_get_contents($contentFile), true);

            error_log("✅ Conteúdo encontrado em arquivo para página: $pageId");

            echo json_encode([
                'success' => true,
                'content' => $contentData['content'] ?? '',
                'format' => $contentData['format'] ?? 'html',
                'updated_at' => $contentData['updated_at'] ?? null,
                'source' => 'file'
            ]);
        } else {
            error_log("ℹ️ Nenhum conteúdo encontrado em arquivo para página: $pageId");

            echo json_encode([
                'success' => true,
                'content' => '',
                'format' => 'html',
                'updated_at' => null,
                'source' => 'file'
            ]);
        }
    }

} catch (Exception $e) {
    error_log("Erro ao carregar conteúdo: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
