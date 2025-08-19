<?php
// CRUD de páginas de caderno do usuário autenticado
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
    $nid = isset($_GET['notebook_id']) ? (int)$_GET['notebook_id'] : 0;
    if ($nid<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'notebook_id obrigatório']); exit; }
    // valida posse
    $chk = $conn->prepare('SELECT id FROM notebooks WHERE id=:id AND user_id=:uid');
    $chk->execute([':id'=>$nid, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Caderno não encontrado']); exit; }

    $st = $conn->prepare('SELECT * FROM notebook_pages WHERE notebook_id = :nid ORDER BY id ASC');
    $st->execute([':nid'=>$nid]);
    $rows = $st->fetchAll();
    $items = array_map(function($r){ return [ 'id'=>(int)$r['id'], 'title'=>$r['title'], 'color'=>$r['color'], 'content'=>$r['content'], 'created'=>$r['created_at'], 'updated'=>$r['updated_at'] ]; }, $rows);
    echo json_encode(['success'=>true, 'items'=>$items]);
    exit;
  }

  if ($method === 'POST') {
    $b = read_json_body();
    $nid = (int)($b['notebook_id'] ?? 0);
    if ($nid<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'notebook_id obrigatório']); exit; }
    $chk = $conn->prepare('SELECT id FROM notebooks WHERE id=:id AND user_id=:uid');
    $chk->execute([':id'=>$nid, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Caderno não encontrado']); exit; }

    $title = trim((string)($b['title'] ?? 'Página'));
    $color = isset($b['color']) ? (string)$b['color'] : null;
    $content = isset($b['content']) ? (string)$b['content'] : '';
    $st = $conn->prepare('INSERT INTO notebook_pages (notebook_id, title, color, content) VALUES (:nid,:t,:c,:ct)');
    $st->execute([':nid'=>$nid, ':t'=>$title, ':c'=>$color, ':ct'=>$content]);
    echo json_encode(['success'=>true, 'id'=>(int)$conn->lastInsertId()]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    // garante posse via join
    $chk = $conn->prepare('SELECT p.id FROM notebook_pages p INNER JOIN notebooks n ON n.id = p.notebook_id WHERE p.id=:id AND n.user_id=:uid');
    $chk->execute([':id'=>$id, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Página não encontrada']); exit; }

    $b = read_json_body();
    $fields = [];$params=[':id'=>$id];
    if (isset($b['title'])) { $fields[]='title=:t'; $params[':t']=(string)$b['title']; }
    if (isset($b['color'])) { $fields[]='color=:c'; $params[':c']=(string)$b['color']; }
    if (array_key_exists('content',$b)) { $fields[]='content=:ct'; $params[':ct']=$b['content']; }
    if ($fields){ $sql='UPDATE notebook_pages SET '.implode(',', $fields).' WHERE id=:id'; $up=$conn->prepare($sql); $up->execute($params); }
  // Força atualização do campo updated_at para o horário atual
  $sqlUpdateTime = 'UPDATE notebook_pages SET updated_at=NOW() WHERE id=:id';
  $upTime = $conn->prepare($sqlUpdateTime); $upTime->execute([':id'=>$id]);
  echo json_encode(['success'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $del = $conn->prepare('DELETE p FROM notebook_pages p INNER JOIN notebooks n ON n.id = p.notebook_id WHERE p.id=:id AND n.user_id=:uid');
    $del->execute([':id'=>$id, ':uid'=>$uid]);
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][notebook_pages] '.$e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Erro interno']);
}
