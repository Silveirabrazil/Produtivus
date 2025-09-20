<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");

// Sistema de fallback para login do Google - APENAS para conta do proprietário
// Este endpoint funciona offline e permite login mesmo sem conexão com Google

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Método não permitido']);
    exit;
}

require_once '../config/database.php';

// Email do proprietário do sistema (configurar aqui)
$OWNER_EMAIL = 'silveirabrazil@gmail.com'; // ALTERE PARA SEU EMAIL

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';
$fallbackCode = $input['fallback_code'] ?? '';

if (!$email || !$fallbackCode) {
    echo json_encode(['success'=>false,'message'=>'Dados incompletos']);
    exit;
}

// Verifica se o email é do proprietário
if (strtolower(trim($email)) !== strtolower($OWNER_EMAIL)) {
    echo json_encode(['success'=>false,'message'=>'Fallback disponível apenas para conta do proprietário']);
    exit;
}

// Código de fallback especial (pode ser uma senha secreta ou código gerado)
$VALID_FALLBACK_CODES = [
    'produtivus2025',           // Código fixo simples
    'offline_' . date('Ymd'),   // Código baseado na data: offline_20250919
    'emergency_access'          // Código de emergência
];

if (!in_array($fallbackCode, $VALID_FALLBACK_CODES)) {
    echo json_encode(['success'=>false,'message'=>'Código de fallback inválido']);
    exit;
}

try {
    // Procura ou cria usuário do proprietário
    $stmt = $conn->prepare('SELECT id, name, email FROM users WHERE email = :email LIMIT 1');
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Cria conta do proprietário se não existir
        $insertStmt = $conn->prepare('INSERT INTO users (name, email, password) VALUES (:name, :email, :password)');
        $name = 'Proprietário';
        $hashedPassword = password_hash('fallback_' . time(), PASSWORD_BCRYPT); // senha temporária
        $insertStmt->bindParam(':name', $name);
        $insertStmt->bindParam(':email', $email);
        $insertStmt->bindParam(':password', $hashedPassword);
        $insertStmt->execute();

        // Busca o ID do usuário recém-criado
        $stmt = $conn->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        $userResult = $stmt->fetch(PDO::FETCH_ASSOC);

        $user = [
            'id' => $userResult['id'],
            'name' => $name,
            'email' => $email
        ];
    }

    // Cria sessão
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['login_method'] = 'google_fallback';
    $_SESSION['login_time'] = time();

    echo json_encode([
        'success' => true,
        'message' => 'Login via fallback realizado com sucesso',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'login_method' => 'google_fallback'
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('[Produtivus][google_fallback] '.$e->getMessage());
    echo json_encode(['success'=>false,'message'=>'Erro interno do servidor']);
}
?>
