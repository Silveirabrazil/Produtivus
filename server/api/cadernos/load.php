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
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Carregar do arquivo (backup/compatibilidade)
        $data_dir = __DIR__ . '/../../data';
        $file_path = $data_dir . '/cadernos_' . $user_id . '.json';

        $fileData = null;
        if (file_exists($file_path)) {
            $content = file_get_contents($file_path);
            if ($content) {
                $fileData = json_decode($content, true);
            }
        }

        // Tentar carregar do banco de dados se usuário logado
        $dbData = null;
        if ($user_id !== 'guest') {
            try {
                $pdo = getDatabaseConnection();

                // Carregar páginas
                $stmt = $pdo->prepare("
                    SELECT p.id, p.title, p.content, p.notebook_id as notebookId,
                           n.subject_id as subjectId, p.updated_at
                    FROM notebook_pages p
                    LEFT JOIN notebooks n ON p.notebook_id = n.id
                    WHERE p.user_id = ?
                    ORDER BY p.updated_at DESC
                ");
                $stmt->execute([$user_id]);
                $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($pages)) {
                    // Converter formato do banco para o formato esperado
                    foreach ($pages as &$page) {
                        $page['lastModified'] = $page['updated_at'];
                        unset($page['updated_at']);
                    }

                    $dbData = [
                        'title' => 'Cadernos - Sistema Avançado',
                        'content' => $pages[0]['content'] ?? '',
                        'pages' => $pages,
                        'currentPageId' => $pages[0]['id'] ?? 1,
                        'timestamp' => date('c')
                    ];
                }
            } catch (PDOException $e) {
                error_log("Erro ao conectar com banco: " . $e->getMessage());
            }
        }

        // Priorizar dados do banco, usar arquivo como fallback
        $responseData = $dbData ?: $fileData;

        if ($responseData) {
            // Garantir formato consistente
            if (!isset($responseData['pages']) && isset($responseData['content'])) {
                // Converter formato antigo para novo formato
                $responseData['pages'] = [
                    [
                        'id' => 1,
                        'title' => $responseData['title'] ?? 'Página Carregada',
                        'content' => $responseData['content'],
                        'notebookId' => null,
                        'subjectId' => null,
                        'lastModified' => $responseData['timestamp'] ?? date('c')
                    ]
                ];
                $responseData['currentPageId'] = 1;
            }

            echo json_encode([
                'success' => true,
                'source' => $dbData ? 'database' : 'file',
                ...$responseData
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Nenhum documento encontrado'
            ]);
        }

    } else {
        // Método não permitido
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método não permitido'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro ao carregar: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor'
    ]);
}
?>
