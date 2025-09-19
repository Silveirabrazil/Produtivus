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

// Verificar se o usuário está logado (usar 'guest' como fallback para testes)
$userId = normalizeUserId($_SESSION['user_id'] ?? 'guest');

try {
    // Tentar carregar do banco de dados primeiro
    try {
        $pdo = getDatabaseConnection();

        // Buscar páginas do usuário com informações dos cadernos e matérias
        $stmt = $pdo->prepare("
            SELECT
                np.id,
                np.title,
                np.content,
                np.notebook_id,
                nb.subject_id,
                np.created_at,
                np.updated_at
            FROM notebook_pages np
            LEFT JOIN notebooks nb ON np.notebook_id = nb.id
            WHERE np.user_id = ?
            ORDER BY np.updated_at DESC
        ");
        $stmt->execute([$userId]);
        $pages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'pages' => $pages,
            'source' => 'database'
        ]);

    } catch (PDOException $e) {
        // Fallback para arquivo se banco não disponível
        error_log("Banco indisponível, usando arquivo: " . $e->getMessage());

        $dataDir = __DIR__ . '/../../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $pagesFile = $dataDir . '/pages_' . $userId . '.json';

        $pages = [];
        if (file_exists($pagesFile)) {
            $pages = json_decode(file_get_contents($pagesFile), true) ?: [];
        }

        echo json_encode([
            'success' => true,
            'pages' => $pages,
            'source' => 'file'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro geral ao carregar páginas: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor'
    ]);
}
?>
