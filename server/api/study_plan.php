<?php
// CRUD para planner semanal de estudos (itens recorrentes por dia da semana/horário)
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
    // Lista itens do planner do usuário; inclui nome/cor da matéria quando possível
    $sql = 'SELECT sp.id, sp.subject_id, sp.title, sp.color, sp.day_of_week, sp.start_time, sp.end_time, sp.notes,
                   ss.name AS subject_name, ss.color AS subject_color
            FROM study_plan sp
            LEFT JOIN study_subjects ss ON ss.id = sp.subject_id AND ss.user_id = :u
            WHERE sp.user_id = :u
            ORDER BY sp.day_of_week, sp.start_time';
    $st = $conn->prepare($sql);
    $st->execute([':u'=>$uid]);
    $rows = $st->fetchAll();
    $items = array_map(function($r){
      return [
        'id' => (int)$r['id'],
        'subject_id' => isset($r['subject_id']) ? (int)$r['subject_id'] : null,
        'subject_name' => $r['subject_name'] ?? null,
        'title' => $r['title'],
        'color' => $r['color'] ?: ($r['subject_color'] ?? null),
        'day_of_week' => (int)$r['day_of_week'],
        'start_time' => $r['start_time'],
        'end_time' => $r['end_time'],
        'notes' => $r['notes'] ?? null
      ];
    }, $rows);
    echo json_encode(['success'=>true, 'items'=>$items]);
    exit;
  }

  if ($method === 'POST') {
    $b = read_json_body();
    $dow = isset($b['day_of_week']) ? (int)$b['day_of_week'] : -1;
    $start = isset($b['start_time']) ? substr((string)$b['start_time'],0,8) : '';
    $end = isset($b['end_time']) ? substr((string)$b['end_time'],0,8) : '';
    if ($dow < 0 || $dow > 6) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'day_of_week inválido']); exit; }
    if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $start)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'start_time inválido']); exit; }
    if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $end)) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'end_time inválido']); exit; }
    $title = isset($b['title']) ? substr((string)$b['title'], 0, 255) : null;
    $color = isset($b['color']) ? substr((string)$b['color'], 0, 16) : null;
    $subjectId = isset($b['subject_id']) && $b['subject_id'] !== '' ? (int)$b['subject_id'] : null;
    $notes = isset($b['notes']) ? (string)$b['notes'] : null;

    $ins = $conn->prepare('INSERT INTO study_plan (user_id, subject_id, title, color, day_of_week, start_time, end_time, notes) VALUES (:u,:sid,:t,:c,:dow,:st,:et,:n)');
    $ins->execute([':u'=>$uid, ':sid'=>$subjectId, ':t'=>$title, ':c'=>$color, ':dow'=>$dow, ':st'=>$start, ':et'=>$end, ':n'=>$notes]);
    echo json_encode(['success'=>true, 'id'=>(int)$conn->lastInsertId()]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    // ownership
    $chk = $conn->prepare('SELECT id FROM study_plan WHERE id=:id AND user_id=:u');
    $chk->execute([':id'=>$id, ':u'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Não encontrado']); exit; }

    $b = read_json_body();
    $fields = []; $params = [':id'=>$id];
    if (array_key_exists('day_of_week',$b)) { $fields[]='day_of_week=:dow'; $params[':dow']=(int)$b['day_of_week']; }
    if (array_key_exists('start_time',$b)) { $fields[]='start_time=:st'; $params[':st']=substr((string)$b['start_time'],0,8); }
    if (array_key_exists('end_time',$b)) { $fields[]='end_time=:et'; $params[':et']=substr((string)$b['end_time'],0,8); }
    if (array_key_exists('title',$b)) { $fields[]='title=:t'; $params[':t']=substr((string)$b['title'],0,255); }
    if (array_key_exists('color',$b)) { $fields[]='color=:c'; $params[':c']=substr((string)$b['color'],0,16); }
    if (array_key_exists('subject_id',$b)) { $fields[]='subject_id=:sid'; $params[':sid']=($b['subject_id']!=='' && $b['subject_id']!==null) ? (int)$b['subject_id'] : null; }
    if (array_key_exists('notes',$b)) { $fields[]='notes=:n'; $params[':n']=(string)$b['notes']; }
    if ($fields) {
      $sql = 'UPDATE study_plan SET '.implode(',', $fields).' WHERE id=:id';
      $up = $conn->prepare($sql);
      $up->execute($params);
    }
    echo json_encode(['success'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $del = $conn->prepare('DELETE FROM study_plan WHERE id=:id AND user_id=:u');
    $del->execute([':id'=>$id, ':u'=>$uid]);
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][study_plan] '.$e->getMessage());
  http_response_code(500);
  if (function_exists('pv_debug_allowed') && pv_debug_allowed()) {
    echo json_encode(['success'=>false,'message'=>'Erro interno', 'error'=>$e->getMessage()]);
  } else {
    echo json_encode(['success'=>false,'message'=>'Erro interno']);
  }
}
