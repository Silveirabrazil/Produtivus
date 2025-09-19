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

        // Buscar matérias do usuário
        $stmt = $pdo->prepare("
            SELECT id, name, color, created_at
            FROM study_subjects
            WHERE user_id = ?
            ORDER BY name ASC
        ");
        $stmt->execute([$userId]);
        $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'subjects' => $subjects,
            'source' => 'database'
        ]);

    } catch (PDOException $e) {
        // Fallback para arquivo se banco não disponível
        error_log("Banco indisponível, usando arquivo: " . $e->getMessage());

        $dataDir = __DIR__ . '/../../data';
        $subjectsFile = $dataDir . '/subjects_' . $userId . '.json';

        $subjects = [];
        if (file_exists($subjectsFile)) {
            $subjects = json_decode(file_get_contents($subjectsFile), true) ?: [];
        }

        echo json_encode([
            'success' => true,
            'subjects' => $subjects,
            'source' => 'file'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro geral ao carregar matérias: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor'
    ]);
}
?>
