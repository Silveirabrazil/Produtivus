<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
require_once __DIR__ . '/_session_bootstrap.php';
include_once '../config/database.php';

$data = json_decode(file_get_contents('php://input'));
// Lê config de segurança e instala
require_once __DIR__ . '/../../config/app.php';
// Secret para assinar cookie de remember
$installCfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true) ?: [];
$rememberSecret = isset($installCfg['secret']) ? (string)$installCfg['secret'] : (getenv('REMEMBER_SECRET') ?: 'pv-remember-secret');

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
            $_SESSION['last_activity'] = time();

            // Remember-me opcional
            $remember = isset($data->remember) ? (bool)$data->remember : false;
            if ($remember) {
                $uid = (int)$row['id'];
                $exp = time() + (86400 * 30); // 30 dias
                $payload = $uid . ':' . $exp;
                $sig = hash_hmac('sha256', $payload, $rememberSecret);
                $token = $payload . ':' . $sig;
                $secure = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'])==='https');
                $host = $_SERVER['HTTP_HOST'] ?? '';
                $domain = '';
                $main = '.cesarbrasilfotografia.com.br';
                if ($host) { $h = strtolower($host); if (substr($h, -strlen($main)) === $main) { $domain = $main; } }
                setcookie('PVREMEMBER', $token, [ 'expires'=>$exp, 'path'=>'/', 'domain'=>$domain ?: '', 'secure'=>$secure, 'httponly'=>true, 'samesite'=>'Lax' ]);
            }

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
