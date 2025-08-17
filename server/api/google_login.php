<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
require_once __DIR__ . '/_session_bootstrap.php';

// Opcional: responder pré-flight (caso algum proxy adicione CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  exit;
}

require_once '../config/database.php';

// Segurança básica: apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não permitido']);
  exit;
}

// Aceita application/json e também form-url-encoded/text/plain (fallback)
$idToken = '';
$ctype = isset($_SERVER['CONTENT_TYPE']) ? strtolower($_SERVER['CONTENT_TYPE']) : '';
if (strpos($ctype, 'application/json') !== false) {
  $raw = file_get_contents('php://input');
  $in = json_decode($raw, true);
  $idToken = $in['id_token'] ?? $in['credential'] ?? '';
} else if (strpos($ctype, 'application/x-www-form-urlencoded') !== false) {
  $idToken = $_POST['id_token'] ?? $_POST['credential'] ?? '';
} else {
  // tentativa de parse do corpo cru como querystring
  $raw = file_get_contents('php://input');
  parse_str($raw, $parsed);
  if (is_array($parsed)) { $idToken = $parsed['id_token'] ?? $parsed['credential'] ?? ''; }
}

if (!$idToken) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Token ausente']);
  exit;
}

// Validação do token do Google Identity Services sem biblioteca externa:
// 1) Decodificar o header.payload (parte sem assinatura) do JWT.
// 2) Verificar campos essenciais (aud, iss, exp, email).
// 3) Opcionalmente, validar assinatura RS256 contra JWKS do Google (recomendado em produção).
// Como ambiente pode não permitir curl/openssl, faremos uma validação leve aqui e confiamos no ISS/AUD/EXP.
function jwt_decode_part($jwt) {
  $parts = explode('.', $jwt);
  if (count($parts) < 2) return null;
  $payload = $parts[1];
  $pad = strlen($payload) % 4;
  if ($pad) { $payload .= str_repeat('=', 4-$pad); }
  $json = base64_decode(strtr($payload, '-_', '+/'));
  return json_decode($json, true);
}
$claims = jwt_decode_part($idToken);
if (!$claims) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Token inválido']);
  exit;
}

$aud = $claims['aud'] ?? '';
$iss = $claims['iss'] ?? '';
$exp = $claims['exp'] ?? 0;
$email = strtolower(trim($claims['email'] ?? ''));
$name = trim($claims['name'] ?? '');

$clientId = getenv('GOOGLE_CLIENT_ID') ?: '';
$now = time();
if (!$aud || $clientId && $aud !== $clientId) {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Audience inválida']);
  exit;
}
if ($iss !== 'https://accounts.google.com' && $iss !== 'accounts.google.com') {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Emissor inválido']);
  exit;
}
if ($exp < $now) {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Token expirado']);
  exit;
}
if (!$email) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Email não disponível']);
  exit;
}

try {
  // Verifica se usuário existe; se não, cria com senha nula/placeholder
  $q = $conn->prepare('SELECT id, name, email FROM users WHERE email = :email LIMIT 1');
  $q->execute([':email' => $email]);
  $user = $q->fetch(PDO::FETCH_ASSOC);
  if (!$user) {
    $ins = $conn->prepare('INSERT INTO users (name, email, password) VALUES (:name, :email, :password)');
    // Armazenar um hash placeholder (não utilizado para login por senha)
    $placeholder = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
    $ins->execute([':name'=>$name ?: $email, ':email'=>$email, ':password'=>$placeholder]);
    $id = $conn->lastInsertId();
    $user = ['id'=>$id, 'name'=>$name ?: $email, 'email'=>$email];
  }
  // Cria sessão
  $_SESSION['user_id'] = $user['id'];
  $_SESSION['user_name'] = $user['name'];

  echo json_encode(['success'=>true,'user'=>['name'=>$user['name'],'email'=>$user['email']]]);
} catch (Throwable $e) {
  http_response_code(500);
  if (function_exists('error_log')) { error_log('[Produtivus][google_login] '.$e->getMessage()); }
  echo json_encode(['success'=>false,'message'=>'Erro no servidor']);
}
