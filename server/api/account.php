<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_auth_guard.php';
require_once __DIR__ . '/../config/database.php';

$uid = (int)($_SESSION['user_id'] ?? 0);
if ($uid <= 0) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Não autenticado']); exit; }

function ensure_user_profiles_table($conn) {
  if (!($conn instanceof PDO)) {
    return;
  }
  static $checked = false;
  if ($checked) { return; }

  try {
    $driver = $conn->getAttribute(PDO::ATTR_DRIVER_NAME);
  } catch (Throwable $e) {
    if (function_exists('error_log')) {
      error_log('[Produtivus][account] Falha ao obter driver PDO: '.$e->getMessage());
    }
    return;
  }

  $sql = null;

  if ($driver === 'sqlite') {
    $sql = "CREATE TABLE IF NOT EXISTS user_profiles (\n        user_id INTEGER PRIMARY KEY,\n        avatar TEXT NULL,\n        birth TEXT NULL,\n        gender TEXT NULL,\n        marital TEXT NULL,\n        nationality TEXT NULL,\n        birthplace TEXT NULL,\n        cpf TEXT NULL,\n        street TEXT NULL,\n        number TEXT NULL,\n        complement TEXT NULL,\n        neighborhood TEXT NULL,\n        zip TEXT NULL,\n        city TEXT NULL,\n        state TEXT NULL,\n        phone TEXT NULL,\n        mobile TEXT NULL,\n        emergency TEXT NULL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      )";
  } else {
    $sql = "CREATE TABLE IF NOT EXISTS user_profiles (\n        user_id INT NOT NULL,\n        avatar TEXT NULL,\n        birth DATE NULL,\n        gender ENUM('F','M','O','N') NULL,\n        marital ENUM('solteiro','casado','divorciado','viuvo') NULL,\n        nationality VARCHAR(100) NULL,\n        birthplace VARCHAR(120) NULL,\n        cpf VARCHAR(20) NULL,\n        street VARCHAR(160) NULL,\n        number VARCHAR(20) NULL,\n        complement VARCHAR(120) NULL,\n        neighborhood VARCHAR(120) NULL,\n        zip VARCHAR(20) NULL,\n        city VARCHAR(120) NULL,\n        state CHAR(2) NULL,\n        phone VARCHAR(30) NULL,\n        mobile VARCHAR(30) NULL,\n        emergency VARCHAR(160) NULL,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n        CONSTRAINT pk_user_profiles PRIMARY KEY (user_id),\n        CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE\n      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
  }

  if ($sql) {
    try {
      $conn->exec($sql);
    } catch (Throwable $e) {
      if (function_exists('error_log')) {
        error_log('[Produtivus][account] Falha ao garantir user_profiles: '.$e->getMessage());
      }
    }
  }

  $checked = true;
}

ensure_user_profiles_table($conn);

function read_json_body() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

try {
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($method === 'OPTIONS') { http_response_code(204); exit; }

  if ($method === 'GET') {
    // Dados básicos do usuário
    $st = $conn->prepare('SELECT id, name, email, created_at FROM users WHERE id = :id LIMIT 1');
    $st->execute([':id'=>$uid]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if (!$u) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Usuário não encontrado']); exit; }
    // Perfil estendido (se existir)
    $sp = $conn->prepare('SELECT avatar, birth, gender, marital, nationality, birthplace, cpf, street, number, complement, neighborhood, zip, city, state, phone, mobile, emergency FROM user_profiles WHERE user_id = :id LIMIT 1');
    $sp->execute([':id'=>$uid]);
    $profile = $sp->fetch(PDO::FETCH_ASSOC) ?: null;
    echo json_encode(['success'=>true, 'user'=>$u, 'profile'=>$profile]);
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

    // Campos de perfil estendido (opcionais)
    $pcols = ['avatar','birth','gender','marital','nationality','birthplace','cpf','street','number','complement','neighborhood','zip','city','state','phone','mobile','emergency'];
    $pvals = [];
    $hasProfile = false;
    foreach ($pcols as $c) {
      if (array_key_exists($c, $body)) { $hasProfile = true; $pvals[$c] = $body[$c]; }
    }

    // Atualiza tabela users se houver mudanças
    if ($fields) {
      $sql = 'UPDATE users SET '.implode(', ', $fields).' WHERE id = :id';
      $up = $conn->prepare($sql);
      $up->execute($params);
      if (isset($params[':n'])) { $_SESSION['user_name'] = $params[':n']; }
    }

    // UPSERT do perfil se enviado
    if ($hasProfile) {
      // Normalização básica
      $p = [
        ':uid'=>$uid,
        ':avatar'=>isset($pvals['avatar']) ? (string)$pvals['avatar'] : null,
        ':birth'=>isset($pvals['birth']) && $pvals['birth']!=='' ? (string)$pvals['birth'] : null,
        ':gender'=>isset($pvals['gender']) && $pvals['gender']!=='' ? (string)$pvals['gender'] : null,
        ':marital'=>isset($pvals['marital']) && $pvals['marital']!=='' ? (string)$pvals['marital'] : null,
        ':nationality'=>isset($pvals['nationality']) ? (string)$pvals['nationality'] : null,
        ':birthplace'=>isset($pvals['birthplace']) ? (string)$pvals['birthplace'] : null,
        ':cpf'=>isset($pvals['cpf']) ? (string)$pvals['cpf'] : null,
        ':street'=>isset($pvals['street']) ? (string)$pvals['street'] : null,
        ':number'=>isset($pvals['number']) ? (string)$pvals['number'] : null,
        ':complement'=>isset($pvals['complement']) ? (string)$pvals['complement'] : null,
        ':neighborhood'=>isset($pvals['neighborhood']) ? (string)$pvals['neighborhood'] : null,
        ':zip'=>isset($pvals['zip']) ? (string)$pvals['zip'] : null,
        ':city'=>isset($pvals['city']) ? (string)$pvals['city'] : null,
        ':state'=>isset($pvals['state']) ? (string)$pvals['state'] : null,
        ':phone'=>isset($pvals['phone']) ? (string)$pvals['phone'] : null,
        ':mobile'=>isset($pvals['mobile']) ? (string)$pvals['mobile'] : null,
        ':emergency'=>isset($pvals['emergency']) ? (string)$pvals['emergency'] : null,
      ];
      // Tenta update; se 0 linhas, faz insert
      $upd = $conn->prepare('UPDATE user_profiles SET avatar=:avatar, birth=:birth, gender=:gender, marital=:marital, nationality=:nationality, birthplace=:birthplace, cpf=:cpf, street=:street, number=:number, complement=:complement, neighborhood=:neighborhood, zip=:zip, city=:city, state=:state, phone=:phone, mobile=:mobile, emergency=:emergency WHERE user_id=:uid');
      $upd->execute($p);
      if ($upd->rowCount() === 0) {
        $ins = $conn->prepare('INSERT INTO user_profiles (user_id, avatar, birth, gender, marital, nationality, birthplace, cpf, street, number, complement, neighborhood, zip, city, state, phone, mobile, emergency) VALUES (:uid, :avatar, :birth, :gender, :marital, :nationality, :birthplace, :cpf, :street, :number, :complement, :neighborhood, :zip, :city, :state, :phone, :mobile, :emergency)');
        $ins->execute($p);
      }
    }

    if (!$fields && !$hasProfile) { echo json_encode(['success'=>true, 'updated'=>false]); exit; }
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
