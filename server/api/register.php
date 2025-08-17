<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");

// Pré-flight (caso o host/proxy injete CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success'=>false,'message'=>'Método não permitido']);
    exit;
}

include_once '../config/database.php';

// Aceita JSON ou form-urlencoded
$ctype = isset($_SERVER['CONTENT_TYPE']) ? strtolower($_SERVER['CONTENT_TYPE']) : '';
if (strpos($ctype, 'application/json') !== false) {
    $data = json_decode(file_get_contents('php://input'));
} else if (strpos($ctype, 'application/x-www-form-urlencoded') !== false) {
    $data = (object) [
        'name' => $_POST['name'] ?? null,
        'email' => $_POST['email'] ?? null,
        'password' => $_POST['password'] ?? null,
    ];
} else {
    // tentativa de parse do corpo cru como querystring
    $raw = file_get_contents('php://input');
    parse_str($raw, $parsed);
    $data = (object) [
        'name' => $parsed['name'] ?? null,
        'email' => $parsed['email'] ?? null,
        'password' => $parsed['password'] ?? null,
    ];
}

if (empty($data->name) || empty($data->email) || empty($data->password)) {
    echo json_encode([ 'success' => false, 'message' => 'Dados incompletos.' ]);
    exit;
}

$email = strtolower(trim($data->email));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([ 'success' => false, 'message' => 'Email inválido.' ]);
    exit;
}

// Validação de senha mínima (evita 500 por constraints futuras)
if (strlen((string)$data->password) < 8) {
    echo json_encode([ 'success' => false, 'message' => 'Senha muito curta (mínimo 8 caracteres).' ]);
    exit;
}

// Criptografa a senha - NUNCA guarde senhas em texto puro!
$hashed_password = password_hash($data->password, PASSWORD_BCRYPT);

try {
    // Verifica se já existe usuário com este email
    $check = $conn->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $check->bindParam(':email', $email);
    $check->execute();
    if ($check->rowCount() > 0) {
        echo json_encode([ 'success' => false, 'message' => 'Email já cadastrado.' ]);
        exit;
    }

    $query = 'INSERT INTO users (name, email, password) VALUES (:name, :email, :password)';
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':name', $data->name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password', $hashed_password);
    $stmt->execute();

    echo json_encode([ 'success' => true, 'message' => 'Usuário registrado com sucesso.' ]);
} catch (PDOException $e) {
    // Erro genérico para o cliente
    http_response_code(500);
    if (function_exists('error_log')) { error_log('[Produtivus][register] '.$e->getMessage()); }
    echo json_encode([ 'success' => false, 'message' => 'Erro ao registrar usuário.' ]);
}
