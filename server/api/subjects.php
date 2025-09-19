<?php
// CRUD de matérias (subjects) de estudo por usuário autenticado
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_auth_guard.php';
require_once __DIR__ . '/_debug_helper.php';
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
    $courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int)$_GET['course_id'] : null;
    if ($courseId) {
      $stmt = $conn->prepare('SELECT id, name, color, course_id FROM study_subjects WHERE user_id=:u AND course_id=:c ORDER BY name ASC');
      $stmt->execute([':u'=>$uid, ':c'=>$courseId]);
    } else {
      $stmt = $conn->prepare('SELECT id, name, color, course_id FROM study_subjects WHERE user_id=:u ORDER BY name ASC');
      $stmt->execute([':u'=>$uid]);
    }
    $rows = $stmt->fetchAll();
    $items = array_map(fn($r)=> [ 'id'=>(int)$r['id'], 'name'=>$r['name'], 'color'=>$r['color'], 'course_id'=> isset($r['course_id']) ? (int)$r['course_id'] : null ], $rows);
    echo json_encode(['success'=>true, 'items'=>$items]);
    exit;
  }

  if ($method === 'POST') {
    $b = read_json_body();
    $name = trim((string)($b['name'] ?? ''));
    if ($name === '') { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Nome é obrigatório']); exit; }
  $color = isset($b['color']) ? substr((string)$b['color'], 0, 16) : null;
  $courseId = isset($b['course_id']) && $b['course_id'] !== '' ? (int)$b['course_id'] : null;
  $st = $conn->prepare('INSERT INTO study_subjects (user_id, name, color, course_id) VALUES (:u,:n,:c,:cid)');
  $st->execute([':u'=>$uid, ':n'=>$name, ':c'=>$color, ':cid'=>$courseId]);
    echo json_encode(['success'=>true, 'id'=>(int)$conn->lastInsertId()]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $chk = $conn->prepare('SELECT id FROM study_subjects WHERE id=:id AND user_id=:u');
    $chk->execute([':id'=>$id, ':u'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Não encontrado']); exit; }
    $b = read_json_body();
    $fields = []; $params = [':id'=>$id];
  if (isset($b['name'])) { $fields[] = 'name=:n'; $params[':n'] = (string)$b['name']; }
  if (isset($b['color'])) { $fields[] = 'color=:c'; $params[':c'] = substr((string)$b['color'], 0, 16); }
  if (array_key_exists('course_id', $b)) { $fields[] = 'course_id=:cid'; $params[':cid'] = ($b['course_id'] !== '' && $b['course_id'] !== null) ? (int)$b['course_id'] : null; }
    if ($fields) {
      $sql = 'UPDATE study_subjects SET '.implode(',', $fields).' WHERE id=:id';
      $up = $conn->prepare($sql);
      $up->execute($params);
    }
    echo json_encode(['success'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $del = $conn->prepare('DELETE FROM study_subjects WHERE id=:id AND user_id=:u');
    $del->execute([':id'=>$id, ':u'=>$uid]);
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][subjects] '.$e->getMessage());
  http_response_code(500);
  if (function_exists('pv_debug_allowed') && pv_debug_allowed()) {
    echo json_encode(['success'=>false,'message'=>'Erro interno', 'error'=>$e->getMessage()]);
  } else {
    echo json_encode(['success'=>false,'message'=>'Erro interno']);
  }
}
