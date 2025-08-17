<?php
// CRUD de tarefas e subtarefas do usuário autenticado
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

function map_task_row($row, $subs) {
  return [
    'id' => (int)$row['id'],
    'title' => (string)$row['title'],
    'desc' => $row['description'],
    'start' => $row['start_date'],
    'end' => $row['end_date'],
    'color' => $row['color'],
    'done' => (bool)$row['done'],
    'subtasks' => array_map(function($s){ return [ 'id'=>(int)$s['id'], 'text'=>$s['text'], 'done'=>(bool)$s['done'] ]; }, $subs)
  ];
}

try {
  $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
  if ($method === 'OPTIONS') { http_response_code(204); exit; }

  if ($method === 'GET') {
    // lista todas as tarefas do usuário com subtarefas
    $stmt = $conn->prepare('SELECT * FROM tasks WHERE user_id = :uid ORDER BY id DESC');
    $stmt->execute([':uid'=>$uid]);
    $tasks = $stmt->fetchAll();
    $ids = array_map(fn($r)=> (int)$r['id'], $tasks);
    $subsByTask = [];
    if (count($ids)>0) {
      $in = implode(',', array_fill(0, count($ids), '?'));
      $st2 = $conn->prepare("SELECT * FROM subtasks WHERE task_id IN ($in) ORDER BY id ASC");
      $st2->execute($ids);
      while ($s = $st2->fetch()) {
        $tid = (int)$s['task_id'];
        if (!isset($subsByTask[$tid])) $subsByTask[$tid] = [];
        $subsByTask[$tid][] = $s;
      }
    }
    $out = array_map(function($t) use ($subsByTask){
      $tid = (int)$t['id'];
      $subs = $subsByTask[$tid] ?? [];
      return map_task_row($t, $subs);
    }, $tasks);
    echo json_encode(['success'=>true, 'items'=>$out]);
    exit;
  }

  if ($method === 'POST') {
    $body = read_json_body();
    $title = trim((string)($body['title'] ?? ''));
    if ($title === '') { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Título obrigatório']); exit; }
    $desc = isset($body['desc']) ? (string)$body['desc'] : null;
    $start = isset($body['start']) && $body['start'] !== '' ? $body['start'] : null;
    $end = isset($body['end']) && $body['end'] !== '' ? $body['end'] : null;
    $color = isset($body['color']) ? (string)$body['color'] : null;
    $done = !empty($body['done']) ? 1 : 0;

    $st = $conn->prepare('INSERT INTO tasks (user_id, title, description, start_date, end_date, color, done) VALUES (:uid,:t,:d,:s,:e,:c,:f)');
    $st->execute([':uid'=>$uid, ':t'=>$title, ':d'=>$desc, ':s'=>$start, ':e'=>$end, ':c'=>$color, ':f'=>$done]);
    $taskId = (int)$conn->lastInsertId();

    $subtasks = is_array($body['subtasks'] ?? null) ? $body['subtasks'] : [];
    if ($subtasks) {
      $is = $conn->prepare('INSERT INTO subtasks (task_id, text, done) VALUES (:tid, :tx, :dn)');
      foreach ($subtasks as $s) {
        $tx = trim((string)($s['text'] ?? ''));
        if ($tx === '') continue;
        $dn = !empty($s['done']) ? 1 : 0;
        $is->execute([':tid'=>$taskId, ':tx'=>$tx, ':dn'=>$dn]);
      }
    }

    echo json_encode(['success'=>true, 'id'=>$taskId]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $body = read_json_body();

    // garante que a tarefa pertence ao usuário
    $chk = $conn->prepare('SELECT id FROM tasks WHERE id=:id AND user_id=:uid');
    $chk->execute([':id'=>$id, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Não encontrado']); exit; }

    $fields = [];
    $params = [':id'=>$id];
    if (isset($body['title'])) { $fields[] = 'title = :t'; $params[':t'] = (string)$body['title']; }
    if (array_key_exists('desc',$body)) { $fields[] = 'description = :d'; $params[':d'] = $body['desc']!==null ? (string)$body['desc'] : null; }
    if (array_key_exists('start',$body)) { $fields[] = 'start_date = :s'; $params[':s'] = $body['start']!=='' ? $body['start'] : null; }
    if (array_key_exists('end',$body)) { $fields[] = 'end_date = :e'; $params[':e'] = $body['end']!=='' ? $body['end'] : null; }
    if (isset($body['color'])) { $fields[] = 'color = :c'; $params[':c'] = (string)$body['color']; }
    if (isset($body['done'])) { $fields[] = 'done = :f'; $params[':f'] = !empty($body['done']) ? 1 : 0; }

    if ($fields) {
      $sql = 'UPDATE tasks SET ' . implode(', ', $fields) . ' WHERE id = :id';
      $up = $conn->prepare($sql);
      $up->execute($params);
    }

    if (isset($body['subtasks']) && is_array($body['subtasks'])) {
      // estratégia simples: apagar e recriar subtarefas
      $conn->prepare('DELETE FROM subtasks WHERE task_id = :tid')->execute([':tid'=>$id]);
      $is = $conn->prepare('INSERT INTO subtasks (task_id, text, done) VALUES (:tid,:tx,:dn)');
      foreach ($body['subtasks'] as $s) {
        $tx = trim((string)($s['text'] ?? ''));
        if ($tx === '') continue;
        $dn = !empty($s['done']) ? 1 : 0;
        $is->execute([':tid'=>$id, ':tx'=>$tx, ':dn'=>$dn]);
      }
    }

    echo json_encode(['success'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    // apaga apenas se pertencer ao usuário
    $del = $conn->prepare('DELETE FROM tasks WHERE id=:id AND user_id=:uid');
    $del->execute([':id'=>$id, ':uid'=>$uid]);
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][tasks] '.$e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Erro interno']);
}
