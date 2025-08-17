<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_auth_guard.php';
require_once __DIR__ . '/../config/database.php';

$uid = (int)($_SESSION['user_id'] ?? 0);
if ($uid <= 0) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Não autenticado']); exit; }

function read_json_body() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

try {
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($method === 'OPTIONS') { http_response_code(204); exit; }

  if ($method === 'GET') {
    $st = $conn->prepare('SELECT id, name, email, created_at FROM users WHERE id = :id LIMIT 1');
    $st->execute([':id'=>$uid]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if (!$u) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Usuário não encontrado']); exit; }
    echo json_encode(['success'=>true, 'user'=>$u]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $body = read_json_body();
    $fields = [];
    $params = [':id'=>$uid];

    if (isset($body['name'])) { $name = trim((string)$body['name']); if ($name===''){ http_response_code(400); echo json_encode(['success'=>false,'message'=>'Nome obrigatório']); exit; } $fields[]='name = :n'; $params[':n']=$name; }
    if (isset($body['email'])) {
      $email = strtolower(trim((string)$body['email']));
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Email inválido']); exit; }
      // impedir colisão com outro usuário
      $chk = $conn->prepare('SELECT id FROM users WHERE email=:e AND id<>:id LIMIT 1');
      $chk->execute([':e'=>$email, ':id'=>$uid]);
      if ($chk->fetch()) { http_response_code(409); echo json_encode(['success'=>false,'message'=>'Email já em uso']); exit; }
      $fields[]='email = :e'; $params[':e']=$email;
    }
    // troca de senha opcional
    if (isset($body['currentPassword']) || isset($body['newPassword'])) {
      $current = (string)($body['currentPassword'] ?? '');
      $new = (string)($body['newPassword'] ?? '');
      if (strlen($new) < 8) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Nova senha muito curta (mínimo 8).']); exit; }
      // busca hash atual
      $st = $conn->prepare('SELECT password FROM users WHERE id=:id');
      $st->execute([':id'=>$uid]);
      $row = $st->fetch(PDO::FETCH_ASSOC);
      $hash = $row ? (string)$row['password'] : '';
      if ($hash && !password_verify($current, $hash)) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Senha atual incorreta']); exit; }
      $newHash = password_hash($new, PASSWORD_BCRYPT);
      $fields[] = 'password = :p'; $params[':p'] = $newHash;
    }

    if (!$fields) { echo json_encode(['success'=>true, 'updated'=>false]); exit; }
    $sql = 'UPDATE users SET '.implode(', ', $fields).' WHERE id = :id';
    $up = $conn->prepare($sql);
    $up->execute($params);

    // manter sessão consistente com nome atualizado
    if (isset($params[':n'])) { $_SESSION['user_name'] = $params[':n']; }

    echo json_encode(['success'=>true, 'updated'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $body = read_json_body();
    $confirm = isset($body['confirm']) ? (string)$body['confirm'] : '';
    if ($confirm !== 'DELETE') { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Confirmação inválida']); exit; }
    // apagar usuário (cascade apaga tasks, notebooks, pages, subtasks)
    $del = $conn->prepare('DELETE FROM users WHERE id = :id');
    $del->execute([':id'=>$uid]);
    // encerra sessão
    session_destroy();
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][account] '.$e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Erro interno']);
}
