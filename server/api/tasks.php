<?php
// CRUD de tarefas e subtarefas do usuário autenticado
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/_auth_guard.php';
require_once __DIR__ . '/_debug_helper.php';
require_once __DIR__ . '/_input_validator.php';
require_once __DIR__ . '/../config/database.php';

$uid = (int)($_SESSION['user_id'] ?? 0);
if ($uid <= 0) { http_response_code(401); echo json_encode(['success'=>false,'message'=>'Não autenticado']); exit; }

// Rate limiting básico
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!InputValidator::checkRateLimit('tasks_api_' . $clientIP, 120, 60)) {
    http_response_code(429);
    echo json_encode(['success'=>false,'message'=>'Muitas requisições. Tente novamente em alguns segundos.']);
    exit;
}

function read_json_body() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function pv_decode_string($value) {
  if (!is_string($value)) {
    return $value;
  }
  return html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function pv_prepare_meta_payload($value) {
  if ($value === null) {
    return null;
  }
  if (is_array($value)) {
    return json_encode($value);
  }
  if (is_string($value)) {
    $decoded = json_decode(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'), true);
    if (is_array($decoded)) {
      return json_encode($decoded);
    }
  }
  return null;
}

function map_task_row($row, $subs) {
  return [
    'id' => (int)$row['id'],
    'title' => pv_decode_string($row['title']),
    'desc' => pv_decode_string($row['description']),
    'description' => pv_decode_string($row['description']),
  'start' => $row['start_date'] ? str_replace(' ', 'T', $row['start_date']) : null,
  'end' => $row['end_date'] ? str_replace(' ', 'T', $row['end_date']) : null,
    'color' => $row['color'],
  'subject_id' => isset($row['subject_id']) ? (int)$row['subject_id'] : null,
  'series_id' => isset($row['series_id']) ? (int)$row['series_id'] : null,
    'created_at' => array_key_exists('created_at', $row) && $row['created_at'] ? str_replace(' ', 'T', $row['created_at']) : null,
    'updated_at' => array_key_exists('updated_at', $row) && $row['updated_at'] ? str_replace(' ', 'T', $row['updated_at']) : null,
    'location' => array_key_exists('location',$row) ? pv_decode_string($row['location']) : null,
    'reminder_minutes' => array_key_exists('reminder_minutes',$row) ? (is_null($row['reminder_minutes'])? null : (int)$row['reminder_minutes']) : null,
    'is_private' => array_key_exists('is_private',$row) ? (bool)$row['is_private'] : null,
    'meta' => (function($row){
      if (!array_key_exists('meta_json',$row) || $row['meta_json']===null || $row['meta_json']==='') return null;
      $m = json_decode($row['meta_json'], true);
      return is_array($m) ? $m : null;
    })($row),
    'external' => (array_key_exists('ext_provider',$row) || array_key_exists('ext_id',$row)) ? [ 'provider' => $row['ext_provider'] ?? null, 'id' => $row['ext_id'] ?? null ] : null,
    'done' => (bool)$row['done'],
    'subtasks' => array_map(function($s){ return [ 'id'=>(int)$s['id'], 'text'=>$s['text'], 'done'=>(bool)$s['done'] ]; }, $subs)
  ];
}

// helpers para detectar colunas no DB e adaptar queries quando host não foi migrado
function pv_db_name($pdo){
  if (!($pdo instanceof PDO)) { return ''; }
  try { $r = $pdo->query('SELECT DATABASE() AS db')->fetch(); return $r && !empty($r['db']) ? $r['db'] : ''; } catch(Throwable $e){ return ''; }
}
function pv_column_exists($pdo, string $db, string $table, string $column){
  if (!($pdo instanceof PDO)) { return false; }
  try {
    $st = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME=:t AND COLUMN_NAME=:c LIMIT 1');
    $st->execute([':db'=>$db, ':t'=>$table, ':c'=>$column]);
    return (bool)$st->fetchColumn();
  } catch(Throwable $e) { return false; }
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

    // Sanitizar dados de entrada
    $body = InputValidator::sanitizeInput($body);

    // Validar dados obrigatórios
    if (!InputValidator::validateTask($body)) {
      http_response_code(400);
      echo json_encode([
        'success' => false,
        'message' => InputValidator::getFirstError(),
        'errors' => InputValidator::getErrors()
      ]);
      exit;
    }

    // detectar esquema disponível
    $dbName = pv_db_name($conn);
    $hasSubjectId = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'subject_id') : false;
    $hasSeriesId  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'series_id') : false;
  $hasLocation  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'location') : false;
  $hasReminder  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'reminder_minutes') : false;
  $hasPrivate   = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'is_private') : false;
  $hasMeta      = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'meta_json') : false;

    // Suporte a criação em lote: occurrences = [{start, end}, ...]
    $metaPayload = pv_prepare_meta_payload($body['meta'] ?? null);

    if (isset($body['occurrences']) && is_array($body['occurrences'])) {
      $title = trim((string)($body['title'] ?? ''));
      $desc = isset($body['desc']) ? InputValidator::limitString((string)$body['desc'], 1000) : null;
      $color = isset($body['color']) ? (string)$body['color'] : null;
      $subjectId = isset($body['subject_id']) && $body['subject_id'] !== '' ? (int)$body['subject_id'] : null;
      $seriesId = isset($body['series_id']) && $body['series_id'] !== '' ? (int)$body['series_id'] : null;
      $done = !empty($body['done']) ? 1 : 0;
      $occ = array_values(array_filter($body['occurrences'], function($o){ return is_array($o) && (isset($o['start']) || isset($o['end'])); }));
      if (count($occ) === 0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Sem ocorrências válidas']); exit; }

  $cols = ['user_id','title','description','start_date','end_date','color','done'];
      if ($hasSubjectId) { $cols[]='subject_id'; }
      if ($hasSeriesId)  { $cols[]='series_id'; }
  if ($hasLocation)  { $cols[]='location'; }
  if ($hasReminder)  { $cols[]='reminder_minutes'; }
  if ($hasPrivate)   { $cols[]='is_private'; }
  if ($hasMeta)      { $cols[]='meta_json'; }
      $sql = 'INSERT INTO tasks (' . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')';
      $st = $conn->prepare($sql);

      $conn->beginTransaction();
      $ids = [];
      foreach ($occ as $o) {
        $s = isset($o['start']) && $o['start'] !== '' ? str_replace('T',' ', substr($o['start'],0,19)) : null;
        $e = isset($o['end']) && $o['end'] !== '' ? str_replace('T',' ', substr($o['end'],0,19)) : null;
  $params = [$uid, $title, $desc, $s, $e, $color, $done];
        if ($hasSubjectId) $params[] = $subjectId;
        if ($hasSeriesId)  $params[] = $seriesId;
  if ($hasLocation)  $params[] = isset($body['location']) ? (string)$body['location'] : null;
  if ($hasReminder)  $params[] = isset($body['reminder_minutes']) && $body['reminder_minutes'] !== '' ? (int)$body['reminder_minutes'] : null;
  if ($hasPrivate)   $params[] = !empty($body['is_private']) ? 1 : 0;
  if ($hasMeta)      $params[] = $metaPayload;
        $st->execute($params);
        $ids[] = (int)$conn->lastInsertId();
      }
      $conn->commit();
      echo json_encode(['success'=>true, 'ids'=>$ids, 'count'=>count($ids)]);
      exit;
    }

    // Criação simples (uma tarefa)
    $title = trim((string)($body['title'] ?? ''));
    if ($title === '') { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Título obrigatório']); exit; }
    $desc = isset($body['desc']) ? (string)$body['desc'] : null;
    $start = isset($body['start']) && $body['start'] !== '' ? str_replace('T',' ', substr($body['start'],0,19)) : null;
    $end = isset($body['end']) && $body['end'] !== '' ? str_replace('T',' ', substr($body['end'],0,19)) : null;
  $color = isset($body['color']) ? (string)$body['color'] : null;
    $subjectId = isset($body['subject_id']) && $body['subject_id'] !== '' ? (int)$body['subject_id'] : null;
    $seriesId = isset($body['series_id']) && $body['series_id'] !== '' ? (int)$body['series_id'] : null;
    $done = !empty($body['done']) ? 1 : 0;
  // optional Outlook-like fields
  $dbName = pv_db_name($conn);
  $hasLocation  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'location') : false;
  $hasReminder  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'reminder_minutes') : false;
  $hasPrivate   = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'is_private') : false;
  $hasMeta      = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'meta_json') : false;

  $cols = ['user_id','title','description','start_date','end_date','color','done'];
  $params = [':uid'=>$uid, ':t'=>$title, ':d'=>$desc, ':s'=>$start, ':e'=>$end, ':c'=>$color, ':f'=>$done];
  $placeholders = [':uid', ':t', ':d', ':s', ':e', ':c', ':f'];
    if ($hasSubjectId) { $cols[]='subject_id'; $placeholders[]=':sid'; $params[':sid']=$subjectId; }
    if ($hasSeriesId)  { $cols[]='series_id';  $placeholders[]=':ser'; $params[':ser']=$seriesId; }
  if ($hasLocation)  { $cols[]='location'; $placeholders[]=':loc'; $params[':loc'] = isset($body['location']) ? (string)$body['location'] : null; }
  if ($hasReminder)  { $cols[]='reminder_minutes'; $placeholders[]=':rm'; $params[':rm'] = isset($body['reminder_minutes']) && $body['reminder_minutes']!=='' ? (int)$body['reminder_minutes'] : null; }
  if ($hasPrivate)   { $cols[]='is_private'; $placeholders[]=':prv'; $params[':prv'] = !empty($body['is_private']) ? 1 : 0; }
  if ($hasMeta)      { $cols[]='meta_json'; $placeholders[]=':mj'; $params[':mj'] = $metaPayload; }
    $sql = 'INSERT INTO tasks (' . implode(',', $cols) . ') VALUES (' . implode(',', $placeholders) . ')';
    $st = $conn->prepare($sql);
    $st->execute($params);
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

  // detectar esquema disponível
  $dbName = pv_db_name($conn);
  $hasSubjectId = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'subject_id') : false;
  $hasSeriesId  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'series_id') : false;
  $hasLocation  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'location') : false;
  $hasReminder  = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'reminder_minutes') : false;
  $hasPrivate   = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'is_private') : false;
  $hasMeta      = $dbName ? pv_column_exists($conn, $dbName, 'tasks', 'meta_json') : false;

    // garante que a tarefa pertence ao usuário
    $chk = $conn->prepare('SELECT id FROM tasks WHERE id=:id AND user_id=:uid');
    $chk->execute([':id'=>$id, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Não encontrado']); exit; }

    $fields = [];
    $params = [':id'=>$id];
    if (isset($body['title'])) { $fields[] = 'title = :t'; $params[':t'] = (string)$body['title']; }
    if (array_key_exists('desc',$body)) { $fields[] = 'description = :d'; $params[':d'] = $body['desc']!==null ? (string)$body['desc'] : null; }
  if (array_key_exists('start',$body)) { $fields[] = 'start_date = :s'; $params[':s'] = $body['start']!=='' ? str_replace('T',' ', substr($body['start'],0,19)) : null; }
  if (array_key_exists('end',$body)) { $fields[] = 'end_date = :e'; $params[':e'] = $body['end']!=='' ? str_replace('T',' ', substr($body['end'],0,19)) : null; }
  if (isset($body['color'])) { $fields[] = 'color = :c'; $params[':c'] = (string)$body['color']; }
  if ($hasSubjectId && array_key_exists('subject_id',$body)) { $fields[] = 'subject_id = :sid'; $params[':sid'] = $body['subject_id']!=='' ? (int)$body['subject_id'] : null; }
  if ($hasSeriesId  && array_key_exists('series_id',$body)) { $fields[] = 'series_id = :ser'; $params[':ser'] = $body['series_id']!=='' ? (int)$body['series_id'] : null; }
  if ($hasLocation && array_key_exists('location',$body)) { $fields[] = 'location = :loc'; $params[':loc'] = isset($body['location']) ? (string)$body['location'] : null; }
  if ($hasReminder && array_key_exists('reminder_minutes',$body)) { $fields[] = 'reminder_minutes = :rm'; $params[':rm'] = $body['reminder_minutes']!=='' ? (int)$body['reminder_minutes'] : null; }
  if ($hasPrivate && array_key_exists('is_private',$body)) { $fields[] = 'is_private = :prv'; $params[':prv'] = !empty($body['is_private']) ? 1 : 0; }
  if ($hasMeta && array_key_exists('meta',$body)) { $fields[] = 'meta_json = :mj'; $params[':mj'] = pv_prepare_meta_payload($body['meta']); }
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
  if (function_exists('pv_debug_allowed') && pv_debug_allowed()) {
    echo json_encode(['success'=>false,'message'=>'Erro interno', 'error'=>$e->getMessage()]);
  } else {
    echo json_encode(['success'=>false,'message'=>'Erro interno']);
  }
}
