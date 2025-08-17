<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
require_once __DIR__ . '/_session_bootstrap.php';
include_once '../config/database.php';

$data = json_decode(file_get_contents('php://input'));

if (empty($data->email) || empty($data->password)) {
    http_response_code(400);
    echo json_encode([ 'success' => false, 'message' => 'Dados incompletos.' ]);
    exit;
}

$email = strtolower(trim($data->email));
$query = 'SELECT id, name, email, password FROM users WHERE email = :email LIMIT 1';
$stmt = $conn->prepare($query);
$stmt->bindParam(':email', $email);
$stmt->execute();

if ($stmt->rowCount() > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    // Verifica se a senha enviada corresponde à senha criptografada no banco
    if (password_verify($data->password, $row['password'])) {
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['user_name'] = $row['name'];
        
        echo json_encode([
            'success' => true,
            'message' => 'Login bem-sucedido.',
            'user' => [ 'name' => $row['name'], 'email' => $row['email'] ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode([ 'success' => false, 'message' => 'Senha incorreta.' ]);
    }
} else {
    http_response_code(404);
    echo json_encode([ 'success' => false, 'message' => 'Usuário não encontrado.' ]);
}
?>
