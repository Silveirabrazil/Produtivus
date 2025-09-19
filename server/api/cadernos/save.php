<?php
require_once 'db-helper.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

// Verificar se o usuário está logado
$user_id = normalizeUserId($_SESSION['user_id'] ?? 'guest');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            throw new Exception('Dados inválidos');
        }

        // Conectar ao banco de dados (se disponível)
        try {
            $pdo = getDatabaseConnection();
            $database_available = true;
        } catch (Exception $e) {
            $database_available = false;
        }

        // Salvar páginas no banco de dados (se disponível)
        if ($database_available && isset($input['pages']) && is_array($input['pages'])) {
            foreach ($input['pages'] as $pageData) {
                $pageId = isset($pageData['id']) ? $pageData['id'] : null;
                $title = isset($pageData['title']) ? $pageData['title'] : 'Página sem título';
                $content = isset($pageData['content']) ? $pageData['content'] : '';
                $notebookId = isset($pageData['notebookId']) ? $pageData['notebookId'] : null;

                if ($pageId && $user_id !== 'guest') {
                    // Verificar se a página já existe
                    $stmt = $pdo->prepare("SELECT id FROM notebook_pages WHERE id = ? AND user_id = ?");
                    $stmt->execute([$pageId, $user_id]);

                    if ($stmt->fetch()) {
                        // Atualizar página existente
                        $stmt = $pdo->prepare("
                            UPDATE notebook_pages
                            SET title = ?, content = ?, notebook_id = ?, updated_at = NOW()
                            WHERE id = ? AND user_id = ?
                        ");
                        $stmt->execute([$title, $content, $notebookId, $pageId, $user_id]);
                    } else {
                        // Criar nova página com ID específico
                        $stmt = $pdo->prepare("
                            INSERT INTO notebook_pages (id, user_id, title, content, notebook_id, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                        ");
                        $stmt->execute([$pageId, $user_id, $title, $content, $notebookId]);
                    }
                }
            }
        }

        // Salvar arquivo de backup (compatibilidade)
        $data_dir = __DIR__ . '/../../data';
        if (!is_dir($data_dir)) {
            mkdir($data_dir, 0755, true);
        }

        $file_path = $data_dir . '/cadernos_' . $user_id . '.json';

        // Preparar dados para arquivo
        $fileData = [
            'title' => $input['title'] ?? 'Documento Sem Título',
            'content' => $input['content'] ?? '',
            'pages' => $input['pages'] ?? [],
            'timestamp' => $input['timestamp'] ?? date('c'),
            'user_id' => $user_id,
            'last_modified' => date('c')
        ];

        // Salvar arquivo
        $success = file_put_contents($file_path, json_encode($fileData, JSON_PRETTY_PRINT));

        if ($success === false) {
            throw new Exception('Erro ao salvar arquivo');
        }

        echo json_encode([
            'success' => true,
            'message' => 'Documento salvo com sucesso',
            'timestamp' => date('c'),
            'database_used' => $database_available && $user_id !== 'guest'
        ]);

    } else {
        // Método não permitido
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método não permitido'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
