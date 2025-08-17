<?php
// CRUD de cadernos do usuário autenticado
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
    // lista cadernos com contagem de páginas
    $st = $conn->prepare('SELECT n.id, n.title, n.color, n.created_at, COUNT(p.id) AS pages_count FROM notebooks n LEFT JOIN notebook_pages p ON p.notebook_id = n.id WHERE n.user_id = :uid GROUP BY n.id ORDER BY n.id DESC');
    $st->execute([':uid'=>$uid]);
    $rows = $st->fetchAll();
    $items = array_map(function($r){ return [ 'id'=>(int)$r['id'], 'title'=>$r['title'], 'color'=>$r['color'], 'created'=>$r['created_at'], 'pages_count'=>(int)$r['pages_count'] ]; }, $rows);
    echo json_encode(['success'=>true, 'items'=>$items]);
    exit;
  }

  if ($method === 'POST') {
    $b = read_json_body();
    $title = trim((string)($b['title'] ?? 'Caderno'));
    $color = isset($b['color']) ? (string)$b['color'] : null;
    $st = $conn->prepare('INSERT INTO notebooks (user_id, title, color) VALUES (:uid, :t, :c)');
    $st->execute([':uid'=>$uid, ':t'=>$title, ':c'=>$color]);
    $id = (int)$conn->lastInsertId();
    echo json_encode(['success'=>true, 'id'=>$id]);
    exit;
  }

  if ($method === 'PUT' || $method === 'PATCH') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $b = read_json_body();
    $chk = $conn->prepare('SELECT id FROM notebooks WHERE id=:id AND user_id=:uid');
    $chk->execute([':id'=>$id, ':uid'=>$uid]);
    if (!$chk->fetch()) { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Não encontrado']); exit; }
    $fields = [];$params=[':id'=>$id];
    if (isset($b['title'])) { $fields[]='title=:t'; $params[':t']=(string)$b['title']; }
    if (isset($b['color'])) { $fields[]='color=:c'; $params[':c']=(string)$b['color']; }
    if ($fields){ $sql='UPDATE notebooks SET '.implode(',', $fields).' WHERE id=:id'; $up=$conn->prepare($sql); $up->execute($params);}    
    echo json_encode(['success'=>true]);
    exit;
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id<=0) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'ID inválido']); exit; }
    $del = $conn->prepare('DELETE FROM notebooks WHERE id=:id AND user_id=:uid');
    $del->execute([':id'=>$id, ':uid'=>$uid]);
    echo json_encode(['success'=>true]);
    exit;
  }

  http_response_code(405);
  echo json_encode(['success'=>false,'message'=>'Método não suportado']);
} catch (Throwable $e) {
  if (function_exists('error_log')) error_log('[Produtivus][notebooks] '.$e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'Erro interno']);
}
