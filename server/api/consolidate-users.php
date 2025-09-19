<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir helper do banco
require_once 'cadernos/db-helper.php';

try {
    // Ler dados JSON do body
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['primary_user_id'])) {
        throw new Exception('User ID principal não fornecido');
    }

    $primaryUserId = intval($input['primary_user_id']);

    error_log("🔄 Iniciando consolidação para user_id: $primaryUserId");

    // Conectar ao banco
    $pdo = getDatabaseConnection();

    // Iniciar transação
    $pdo->beginTransaction();

    // 1. Buscar todos os user_ids diferentes do principal
    $stmt = $pdo->prepare("SELECT DISTINCT user_id FROM notebooks WHERE user_id != ?");
    $stmt->execute([$primaryUserId]);
    $otherUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    error_log("👥 User IDs a serem consolidados: " . implode(', ', $otherUserIds));

    $movedNotebooks = 0;
    $removedUsers = 0;

    // 2. Mover todos os cadernos para o user_id principal
    if (!empty($otherUserIds)) {
        $placeholders = str_repeat('?,', count($otherUserIds) - 1) . '?';
        $stmt = $pdo->prepare("UPDATE notebooks SET user_id = ? WHERE user_id IN ($placeholders)");
        $params = array_merge([$primaryUserId], $otherUserIds);
        $stmt->execute($params);
        $movedNotebooks = $stmt->rowCount();

        error_log("📦 Cadernos movidos: $movedNotebooks");
    }

    // 3. Verificar se existe registro na tabela users para o user_id principal
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
    $stmt->execute([$primaryUserId]);
    $primaryUserExists = $stmt->fetchColumn() > 0;

    if (!$primaryUserExists) {
        error_log("⚠️ User principal não existe na tabela users");
        // Se o user principal não existe, vamos usar o primeiro user disponível
        if (!empty($otherUserIds)) {
            $stmt = $pdo->prepare("UPDATE users SET id = ? WHERE id = ? LIMIT 1");
            $stmt->execute([$primaryUserId, $otherUserIds[0]]);
            error_log("🔄 User principal criado a partir do user_id: " . $otherUserIds[0]);

            // Remover este user_id da lista para não deletar depois
            $otherUserIds = array_filter($otherUserIds, function($id) use ($otherUserIds) {
                return $id !== $otherUserIds[0];
            });
        }
    }

    // 4. Remover users duplicados (manter apenas o principal)
    if (!empty($otherUserIds)) {
        $placeholders = str_repeat('?,', count($otherUserIds) - 1) . '?';
        $stmt = $pdo->prepare("DELETE FROM users WHERE id IN ($placeholders)");
        $stmt->execute($otherUserIds);
        $removedUsers = $stmt->rowCount();

        error_log("🗑️ Usuários removidos: $removedUsers");
    }

    // 5. Verificar resultado final
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM notebooks WHERE user_id = ?");
    $stmt->execute([$primaryUserId]);
    $totalNotebooks = $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT user_id) FROM notebooks");
    $stmt->execute();
    $distinctUsers = $stmt->fetchColumn();

    error_log("📊 Resultado final: $totalNotebooks cadernos para user_id $primaryUserId");
    error_log("👥 Total de users únicos: $distinctUsers");

    // Commit da transação
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Consolidação realizada com sucesso',
        'primary_user_id' => $primaryUserId,
        'moved_notebooks' => $movedNotebooks,
        'removed_users' => $removedUsers,
        'total_notebooks' => $totalNotebooks,
        'distinct_users' => $distinctUsers
    ]);

} catch (Exception $e) {
    // Rollback em caso de erro
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("❌ Erro na consolidação: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Erro na consolidação: ' . $e->getMessage()
    ]);
}
?>
