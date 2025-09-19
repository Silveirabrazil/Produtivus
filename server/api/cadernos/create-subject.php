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

// Verificar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['name']) || empty(trim($input['name']))) {
        echo json_encode(['success' => false, 'error' => 'Nome da matéria é obrigatório']);
        exit;
    }

    $name = trim($input['name']);
    $color = isset($input['color']) ? $input['color'] : '#007bff';

    // Tentar conectar ao banco de dados
    try {
        $pdo = getDatabaseConnection();

        // Garantir que o usuário existe
        ensureGuestUser($pdo, $userId);

        // Verificar se já existe matéria com este nome
        $stmt = $pdo->prepare("SELECT id FROM study_subjects WHERE user_id = ? AND name = ?");
        $stmt->execute([$userId, $name]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Já existe uma matéria com este nome']);
            exit;
        }

        // Inserir nova matéria
        $stmt = $pdo->prepare("
            INSERT INTO study_subjects (user_id, name, color, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $name, $color]);

        $subjectId = $pdo->lastInsertId();

        echo json_encode([
            'success' => true,
            'id' => $subjectId,
            'message' => 'Matéria criada com sucesso!'
        ]);

    } catch (PDOException $e) {
        // Fallback para modo arquivo se banco não disponível
        error_log("Banco indisponível, usando arquivo: " . $e->getMessage());

        $dataDir = __DIR__ . '/../../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $subjectsFile = $dataDir . '/subjects_' . $userId . '.json';
        $subjects = [];

        if (file_exists($subjectsFile)) {
            $subjects = json_decode(file_get_contents($subjectsFile), true) ?: [];
        }

        // Verificar duplicatas
        foreach ($subjects as $subject) {
            if ($subject['name'] === $name) {
                echo json_encode(['success' => false, 'error' => 'Já existe uma matéria com este nome']);
                exit;
            }
        }

        $newId = count($subjects) + 1;
        $subjects[] = [
            'id' => $newId,
            'name' => $name,
            'color' => $color,
            'created_at' => date('Y-m-d H:i:s')
        ];

        file_put_contents($subjectsFile, json_encode($subjects, JSON_PRETTY_PRINT));

        echo json_encode([
            'success' => true,
            'id' => $newId,
            'message' => 'Matéria criada com sucesso! (modo arquivo)'
        ]);
    }

} catch (Exception $e) {
    error_log("Erro geral: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor'
    ]);
}
?>
