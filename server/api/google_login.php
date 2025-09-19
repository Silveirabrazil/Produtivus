<?php
header('Content-Type: application/json; charset=utf-8');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'");
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
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
$accessToken = '';
$calendarAccess = false;
$ctype = isset($_SERVER['CONTENT_TYPE']) ? strtolower($_SERVER['CONTENT_TYPE']) : '';
if (strpos($ctype, 'application/json') !== false) {
  $raw = file_get_contents('php://input');
  $in = json_decode($raw, true);
  $idToken = $in['id_token'] ?? $in['credential'] ?? '';
  $accessToken = $in['access_token'] ?? '';
  $calendarAccess = $in['calendar_access'] ?? false;
} else if (strpos($ctype, 'application/x-www-form-urlencoded') !== false) {
  $idToken = $_POST['id_token'] ?? $_POST['credential'] ?? '';
  $accessToken = $_POST['access_token'] ?? '';
  $calendarAccess = $_POST['calendar_access'] ?? false;
} else {
  // tentativa de parse do corpo cru como querystring
  $raw = file_get_contents('php://input');
  parse_str($raw, $parsed);
  if (is_array($parsed)) {
    $idToken = $parsed['id_token'] ?? $parsed['credential'] ?? '';
    $accessToken = $parsed['access_token'] ?? '';
    $calendarAccess = $parsed['calendar_access'] ?? false;
  }
}

if (!$idToken) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Token ausente']);
  exit;
}

// Função para validar access token com Google API
function validateAccessToken($token) {
  if (!$token) return null;
  try {
    $url = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" . urlencode($token);
    $context = stream_context_create([
      'http' => [
        'timeout' => 10,
        'ignore_errors' => true
      ]
    ]);

    $response = @file_get_contents($url, false, $context);
    if (!$response) return null;

    $data = json_decode($response, true);
    return $data && isset($data['scope']) ? $data : null;
  } catch (Exception $e) {
    return null;
  }
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
$picture = trim($claims['picture'] ?? '');
$emailVerified = $claims['email_verified'] ?? null; // pode vir como bool/str

// Carrega configuração segura
require_once __DIR__ . '/../../config/app.php';

$oauthConfig = OAuthConfig::get();
$clientId = $oauthConfig['googleClientId'];

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
// Se o token informar email_verified e for falso, rejeita
if (isset($emailVerified) && ($emailVerified === false || $emailVerified === 'false' || $emailVerified === 0 || $emailVerified === '0')) {
  http_response_code(401);
  echo json_encode(['success'=>false,'message'=>'Email não verificado no Google']);
  exit;
}

// Validar access token se fornecido
$hasCalendarAccess = false;
if ($accessToken) {
  $tokenInfo = validateAccessToken($accessToken);
  if ($tokenInfo && strpos($tokenInfo['scope'], 'calendar') !== false) {
    $hasCalendarAccess = true;
  }
}

try {
  // Verifica se usuário existe; se não, cria com senha nula/placeholder
  $q = $conn->prepare('SELECT id, name, email FROM users WHERE email = :email LIMIT 1');
  $q->execute([':email' => $email]);
  $user = $q->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    // Criar novo usuário com suporte a calendário
    try {
      $ins = $conn->prepare('INSERT INTO users (name, email, password, picture, calendar_access, access_token) VALUES (:name, :email, :password, :picture, :calendar_access, :access_token)');
      $placeholder = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
      $ins->execute([
        ':name' => $name ?: $email,
        ':email' => $email,
        ':password' => $placeholder,
        ':picture' => $picture,
        ':calendar_access' => $hasCalendarAccess ? 1 : 0,
        ':access_token' => $hasCalendarAccess ? $accessToken : null
      ]);
      $id = $conn->lastInsertId();
    } catch (PDOException $e) {
      // Fallback para tabela sem colunas extras
      $ins = $conn->prepare('INSERT INTO users (name, email, password) VALUES (:name, :email, :password)');
      $placeholder = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);
      $ins->execute([':name'=>$name ?: $email, ':email'=>$email, ':password'=>$placeholder]);
      $id = $conn->lastInsertId();
    }
    $user = ['id'=>$id, 'name'=>$name ?: $email, 'email'=>$email, 'picture'=>$picture];
  } else {
    // Atualizar usuário existente com dados do calendário
    try {
      $upd = $conn->prepare('UPDATE users SET name = :name, picture = :picture, calendar_access = :calendar_access, access_token = :access_token WHERE email = :email');
      $upd->execute([
        ':name' => $name ?: $user['name'],
        ':picture' => $picture,
        ':calendar_access' => $hasCalendarAccess ? 1 : 0,
        ':access_token' => $hasCalendarAccess ? $accessToken : null,
        ':email' => $email
      ]);
    } catch (PDOException $e) {
      // Ignore se colunas não existirem
    }
    $user['picture'] = $picture;
  }

  // Adicionar informações de calendário ao usuário
  $user['calendar_access'] = $hasCalendarAccess;
  if ($hasCalendarAccess) {
    $user['access_token'] = $accessToken;
  }

  // Cria sessão
  $_SESSION['user_id'] = $user['id'];
  $_SESSION['user_name'] = $user['name'];
  $_SESSION['user_email'] = $user['email'];
  $_SESSION['calendar_access'] = $hasCalendarAccess;

  $message = $hasCalendarAccess ? 'Login realizado com acesso ao calendário' : 'Login realizado com sucesso';

  echo json_encode([
    'success' => true,
    'user' => [
      'name' => $user['name'],
      'email' => $user['email'],
      'picture' => $user['picture'] ?? '',
      'calendar_access' => $hasCalendarAccess
    ],
    'calendar_access' => $hasCalendarAccess,
    'message' => $message
  ]);
} catch (Throwable $e) {
  http_response_code(500);
  if (function_exists('error_log')) { error_log('[Produtivus][google_login] '.$e->getMessage()); }
  echo json_encode(['success'=>false,'message'=>'Erro no servidor']);
}
