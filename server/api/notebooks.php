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
    // lista cadernos com contagem de páginas, tolerante a SQL modes e colunas inexistentes
    $courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int)$_GET['course_id'] : 0;
    $subjectId = isset($_GET['subject_id']) && $_GET['subject_id'] !== '' ? (int)$_GET['subject_id'] : 0;
    try {
      // tentativa 1: com JOIN em study_subjects para expor course_id e suportar filtros
      $wheres = ['n.user_id = :uid'];
      $params = [':uid' => $uid];
      if ($subjectId > 0) { $wheres[] = 'n.subject_id = :sid'; $params[':sid'] = $subjectId; }
      if ($courseId > 0)  { $wheres[] = 's.course_id = :cid'; $params[':cid'] = $courseId; }
      $sql = 'SELECT n.id, n.title, n.color, n.subject_id, n.created_at, s.course_id, COUNT(p.id) AS pages_count
              FROM notebooks n
              LEFT JOIN study_subjects s ON s.id = n.subject_id
              LEFT JOIN notebook_pages p ON p.notebook_id = n.id
              WHERE ' . implode(' AND ', $wheres) . '
              GROUP BY n.id, n.title, n.color, n.subject_id, n.created_at, s.course_id
              ORDER BY n.id DESC';
      $st = $conn->prepare($sql);
      $st->execute($params);
      $rows = $st->fetchAll();
      $items = array_map(function($r){ return [ 'id'=>(int)$r['id'], 'title'=>$r['title'], 'color'=>$r['color'], 'subject_id'=> isset($r['subject_id']) ? (int)$r['subject_id'] : null, 'course_id'=> isset($r['course_id']) ? (int)$r['course_id'] : null, 'created'=> ($r['created_at'] ?? null), 'pages_count'=>(int)$r['pages_count'] ]; }, $rows);
      echo json_encode(['success'=>true, 'items'=>$items]);
      exit;
    } catch (Throwable $e1) {
      try {
        // fallback: sem JOIN direto; aplica filtros e course_id via pós-processamento
        $wheres = ['n.user_id = :uid'];
        $params = [':uid' => $uid];
        if ($subjectId > 0) { $wheres[] = 'n.subject_id = :sid'; $params[':sid'] = $subjectId; }
        $sqlN = 'SELECT n.id, n.title, n.color, n.subject_id FROM notebooks n WHERE ' . implode(' AND ', $wheres) . ' ORDER BY n.id DESC';
        $stN = $conn->prepare($sqlN);
        $stN->execute($params);
        $nbs = $stN->fetchAll();

        // carrega mapa de subject_id => course_id quando necessário
        $subjMap = [];
        if ($courseId > 0 || true) {
          try {
            $stS = $conn->prepare('SELECT id, course_id FROM study_subjects WHERE user_id=:uid');
            $stS->execute([':uid'=>$uid]);
            foreach ($stS->fetchAll() as $r) { $subjMap[(int)$r['id']] = isset($r['course_id']) ? (int)$r['course_id'] : null; }
          } catch (Throwable $eS) { /* ignora */ }
        }

        // aplica filtro por course_id em memória, se solicitado
        if ($courseId > 0) {
          $nbs = array_values(array_filter($nbs, function($r) use ($subjMap, $courseId) {
            $sid = isset($r['subject_id']) ? (int)$r['subject_id'] : 0;
            $cid = $sid && isset($subjMap[$sid]) ? (int)$subjMap[$sid] : 0;
            return $cid === $courseId;
          }));
        }

        $ids = array_map(fn($r)=>(int)$r['id'], $nbs);
        $counts = [];
        if ($ids) {
          $in = implode(',', array_fill(0, count($ids), '?'));
          $stC = $conn->prepare("SELECT notebook_id, COUNT(*) c FROM notebook_pages WHERE notebook_id IN ($in) GROUP BY notebook_id");
          $stC->execute($ids);
          foreach ($stC->fetchAll() as $r) { $counts[(int)$r['notebook_id']] = (int)$r['c']; }
        }
        $items = array_map(function($r) use ($counts, $subjMap) {
          $id = (int)$r['id'];
          $sid = isset($r['subject_id']) ? (int)$r['subject_id'] : null;
          $cid = ($sid && isset($subjMap[$sid])) ? (int)$subjMap[$sid] : null;
          return [ 'id'=>$id, 'title'=>$r['title'], 'color'=>$r['color'], 'subject_id'=>$sid, 'course_id'=>$cid, 'created'=>null, 'pages_count'=> (int)($counts[$id] ?? 0) ];
        }, $nbs);
        echo json_encode(['success'=>true, 'items'=>$items]);
        exit;
      } catch (Throwable $e2) {
        http_response_code(500);
        echo json_encode(['success'=>false,'message'=>'Erro ao listar cadernos']);
        exit;
      }
    }
  }

  if ($method === 'POST') {
    $b = read_json_body();
    $title = trim((string)($b['title'] ?? 'Caderno'));
    $color = isset($b['color']) ? (string)$b['color'] : null;
    $subjectId = isset($b['subject_id']) && $b['subject_id'] !== '' ? (int)$b['subject_id'] : null;
    try {
      $st = $conn->prepare('INSERT INTO notebooks (user_id, title, color, subject_id) VALUES (:uid, :t, :c, :sid)');
      $st->execute([':uid'=>$uid, ':t'=>$title, ':c'=>$color, ':sid'=>$subjectId]);
    } catch (Throwable $e) {
      // fallback: sem subject_id
      $st = $conn->prepare('INSERT INTO notebooks (user_id, title, color) VALUES (:uid, :t, :c)');
      $st->execute([':uid'=>$uid, ':t'=>$title, ':c'=>$color]);
    }
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
    $includeSubject = array_key_exists('subject_id',$b);
    if ($includeSubject) { $fields[]='subject_id=:sid'; $params[':sid']= ($b['subject_id'] !== '' && $b['subject_id'] !== null) ? (int)$b['subject_id'] : null; }
    if ($fields){
      try {
        $sql='UPDATE notebooks SET '.implode(',', $fields).' WHERE id=:id'; $up=$conn->prepare($sql); $up->execute($params);
      } catch (Throwable $e) {
        if ($includeSubject) {
          // tenta novamente sem subject_id
          $fields2 = array_values(array_filter($fields, fn($f)=> strpos($f,'subject_id=')===false));
          if ($fields2) { $sql2='UPDATE notebooks SET '.implode(',', $fields2).' WHERE id=:id'; $up2=$conn->prepare($sql2); $up2->execute([':id'=>$id] + array_diff_key($params, [':sid'=>true])); }
        } else { throw $e; }
      }
    }
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
