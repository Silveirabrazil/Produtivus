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

    if (!$input || !isset($input['title']) || empty(trim($input['title']))) {
        echo json_encode(['success' => false, 'error' => 'Título do caderno é obrigatório']);
        exit;
    }

    $title = trim($input['title']);
    $subjectId = isset($input['subject_id']) && !empty($input['subject_id']) ? $input['subject_id'] : null;
    $color = isset($input['color']) ? $input['color'] : '#28a745';

    // Tentar conectar ao banco de dados usando configuração
    try {
        error_log("🔄 Tentando conectar ao banco de dados...");
        $pdo = getDatabaseConnection();
        error_log("✅ Conectado ao banco de dados com sucesso");

        // Garantir que o usuário existe
        ensureGuestUser($pdo, $userId);

        // Verificar se a matéria existe (se fornecida)
        if ($subjectId) {
            $stmt = $pdo->prepare("SELECT id FROM study_subjects WHERE id = ? AND user_id = ?");
            $stmt->execute([$subjectId, $userId]);
            if (!$stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Matéria não encontrada']);
                exit;
            }
        }

        // Inserir novo caderno
        error_log("🔨 Tentando inserir novo caderno: " . json_encode(['userId' => $userId, 'title' => $title, 'subjectId' => $subjectId, 'color' => $color]));
        $stmt = $pdo->prepare("
            INSERT INTO notebooks (user_id, title, subject_id, color, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $result = $stmt->execute([$userId, $title, $subjectId, $color]);
        error_log("📝 Resultado da inserção: " . ($result ? 'sucesso' : 'falha'));

        $notebookId = $pdo->lastInsertId();
        error_log("🆔 ID do caderno criado: " . $notebookId);

        echo json_encode([
            'success' => true,
            'id' => $notebookId,
            'message' => 'Caderno criado com sucesso!'
        ]);

    } catch (PDOException $e) {
        // Erro específico de banco de dados
        error_log("❌ Erro PDO: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Erro de banco de dados: ' . $e->getMessage(),
            'debug' => [
                'code' => $e->getCode(),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]
        ]);
        exit;
    } catch (Exception $e) {
        // Erro de conexão ou configuração
        error_log("Banco indisponível, usando arquivo: " . $e->getMessage());

        $dataDir = __DIR__ . '/../../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $notebooksFile = $dataDir . '/notebooks_' . $userId . '.json';
        $notebooks = [];

        if (file_exists($notebooksFile)) {
            $notebooks = json_decode(file_get_contents($notebooksFile), true) ?: [];
        }

        $newId = count($notebooks) + 1;
        $notebooks[] = [
            'id' => $newId,
            'title' => $title,
            'subject_id' => $subjectId,
            'color' => $color,
            'created_at' => date('Y-m-d H:i:s')
        ];

        file_put_contents($notebooksFile, json_encode($notebooks, JSON_PRETTY_PRINT));

        echo json_encode([
            'success' => true,
            'id' => $newId,
            'message' => 'Caderno criado com sucesso! (modo arquivo)'
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