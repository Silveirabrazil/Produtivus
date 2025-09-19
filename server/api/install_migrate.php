<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Proteção por secret (mesmo padrão do install_db2.php)
$cfg = @json_decode(@file_get_contents(__DIR__ . '/../config/install.json'), true);
$secretCfg = is_array($cfg) && array_key_exists('secret', $cfg) ? trim((string)$cfg['secret']) : '';
$secretIn = isset($_GET['secret']) ? trim((string)$_GET['secret']) : (isset($_POST['secret']) ? trim((string)$_POST['secret']) : '');
if ($secretCfg === '' || $secretIn === '' || !hash_equals($secretCfg, $secretIn)) {
  http_response_code(403);
  echo json_encode(['success'=>false,'message'=>'Forbidden']);
  exit;
}

require_once __DIR__ . '/../config/database.php';
if (!isset($conn) || !($conn instanceof PDO)) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>'DB connection not available']);
  exit;
}

function dbName(PDO $pdo){
  $r = $pdo->query('SELECT DATABASE() AS db')->fetch();
  return $r && !empty($r['db']) ? $r['db'] : '';
}
function tableExists(PDO $pdo, $db, $table){
  $st = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t LIMIT 1');
  $st->execute([':db'=>$db, ':t'=>$table]);
  return (bool)$st->fetchColumn();
}
function columnExists(PDO $pdo, $db, $table, $column){
  $st = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t AND COLUMN_NAME = :c LIMIT 1');
  $st->execute([':db'=>$db, ':t'=>$table, ':c'=>$column]);
  return (bool)$st->fetchColumn();
}
function indexExists(PDO $pdo, $db, $table, $index){
  $st = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t AND INDEX_NAME = :i LIMIT 1');
  $st->execute([':db'=>$db, ':t'=>$table, ':i'=>$index]);
  return (bool)$st->fetchColumn();
}
function fkExists(PDO $pdo, $db, $table, $constraint){
  $st = $pdo->prepare('SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = :db AND TABLE_NAME = :t AND CONSTRAINT_NAME = :c AND CONSTRAINT_TYPE = "FOREIGN KEY" LIMIT 1');
  $st->execute([':db'=>$db, ':t'=>$table, ':c'=>$constraint]);
  return (bool)$st->fetchColumn();
}

$db = dbName($conn);
$actions = [];

try {
  // 1) study_courses: criar primeiro (para permitir FK em subjects)
  if (!tableExists($conn, $db, 'study_courses')) {
    $conn->exec(
      'CREATE TABLE study_courses (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(160) NOT NULL,
        color VARCHAR(16) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_courses_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $actions[] = 'study_courses table created';
  }

  // 2) study_subjects: criar e adicionar course_id + índice + (FK opcional)
  if (!tableExists($conn, $db, 'study_subjects')) {
    $conn->exec(
      'CREATE TABLE study_subjects (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        color VARCHAR(16) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subjects_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $actions[] = 'study_subjects table created';
  }
  if (tableExists($conn, $db, 'study_subjects')) {
    if (!columnExists($conn, $db, 'study_subjects', 'course_id')) {
      $conn->exec('ALTER TABLE study_subjects ADD COLUMN course_id BIGINT NULL');
      $actions[] = 'study_subjects.course_id added';
    }
    if (!indexExists($conn, $db, 'study_subjects', 'idx_subjects_course')) {
      $conn->exec('ALTER TABLE study_subjects ADD INDEX idx_subjects_course (course_id)');
      $actions[] = 'idx_subjects_course added';
    }
    if (tableExists($conn, $db, 'study_courses') && !fkExists($conn, $db, 'study_subjects', 'fk_subjects_course')) {
      // Tentar criar FK; se host não permitir, ignore silenciosamente
      try {
        $conn->exec('ALTER TABLE study_subjects ADD CONSTRAINT fk_subjects_course FOREIGN KEY (course_id) REFERENCES study_courses (id) ON DELETE SET NULL');
        $actions[] = 'fk_subjects_course added';
      } catch (Throwable $e) {
        $actions[] = 'fk_subjects_course skipped: '.$e->getMessage();
      }
    }
  }

  // 3) notebooks: subject_id + índice + FK
  if (tableExists($conn, $db, 'notebooks')) {
    if (!columnExists($conn, $db, 'notebooks', 'subject_id')) {
      $conn->exec('ALTER TABLE notebooks ADD COLUMN subject_id BIGINT NULL');
      $actions[] = 'notebooks.subject_id added';
    }
    if (!indexExists($conn, $db, 'notebooks', 'idx_notebooks_subject')) {
      $conn->exec('ALTER TABLE notebooks ADD INDEX idx_notebooks_subject (subject_id)');
      $actions[] = 'idx_notebooks_subject added';
    }
    if (tableExists($conn, $db, 'study_subjects') && !fkExists($conn, $db, 'notebooks', 'fk_notebooks_subject')) {
      try {
        $conn->exec('ALTER TABLE notebooks ADD CONSTRAINT fk_notebooks_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL');
        $actions[] = 'fk_notebooks_subject added';
      } catch (Throwable $e) {
        $actions[] = 'fk_notebooks_subject skipped: '.$e->getMessage();
      }
    }
  }

  // 4) notebook_pages: subject_id + índice + FK
  if (tableExists($conn, $db, 'notebook_pages')) {
    if (!columnExists($conn, $db, 'notebook_pages', 'subject_id')) {
      $conn->exec('ALTER TABLE notebook_pages ADD COLUMN subject_id BIGINT NULL');
      $actions[] = 'notebook_pages.subject_id added';
    }
    if (!indexExists($conn, $db, 'notebook_pages', 'idx_pages_subject')) {
      $conn->exec('ALTER TABLE notebook_pages ADD INDEX idx_pages_subject (subject_id)');
      $actions[] = 'idx_pages_subject added';
    }
    if (tableExists($conn, $db, 'study_subjects') && !fkExists($conn, $db, 'notebook_pages', 'fk_pages_subject')) {
      try {
        $conn->exec('ALTER TABLE notebook_pages ADD CONSTRAINT fk_pages_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL');
        $actions[] = 'fk_pages_subject added';
      } catch (Throwable $e) {
        $actions[] = 'fk_pages_subject skipped: '.$e->getMessage();
      }
    }
  }

  // 5) study_plan: criar tabela se não existir (para o planner)
  if (!tableExists($conn, $db, 'study_plan')) {
    $conn->exec(
      'CREATE TABLE study_plan (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subject_id BIGINT NULL,
        title VARCHAR(255) NULL,
        color VARCHAR(16) NULL,
        day_of_week TINYINT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sp_user_dow (user_id, day_of_week)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );
    $actions[] = 'study_plan table created';
    // adicionar FK para subject_id se possível
    if (tableExists($conn, $db, 'study_subjects')) {
      try {
        $conn->exec('ALTER TABLE study_plan ADD INDEX idx_sp_subject (subject_id)');
        $conn->exec('ALTER TABLE study_plan ADD CONSTRAINT fk_sp_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL');
        $actions[] = 'study_plan FKs added';
      } catch (Throwable $e) {
        $actions[] = 'study_plan FKs skipped: '.$e->getMessage();
      }
    }
  }

  // 6) tasks: garantir DATETIME em start_date/end_date (antes eram DATE)
  if (tableExists($conn, $db, 'tasks')) {
    // detectar tipo atual
    $colType = function(string $col) use ($conn, $db) {
      $st = $conn->prepare('SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=:db AND TABLE_NAME="tasks" AND COLUMN_NAME=:c');
      $st->execute([':db'=>$db, ':c'=>$col]);
      $t = $st->fetchColumn();
      return $t ? strtolower($t) : '';
    };
    $sd = $colType('start_date');
    $ed = $colType('end_date');
    if ($sd === 'date') { $conn->exec('ALTER TABLE tasks MODIFY COLUMN start_date DATETIME NULL'); $actions[]='tasks.start_date -> DATETIME'; }
    if ($ed === 'date') { $conn->exec('ALTER TABLE tasks MODIFY COLUMN end_date DATETIME NULL'); $actions[]='tasks.end_date -> DATETIME'; }

    // adicionar subject_id e series_id + índices, se faltarem
    if (!columnExists($conn, $db, 'tasks', 'subject_id')) {
      $conn->exec('ALTER TABLE tasks ADD COLUMN subject_id BIGINT NULL');
      $actions[] = 'tasks.subject_id added';
    }
    if (!indexExists($conn, $db, 'tasks', 'idx_tasks_subject')) {
      try { $conn->exec('ALTER TABLE tasks ADD INDEX idx_tasks_subject (subject_id)'); $actions[] = 'idx_tasks_subject added'; } catch (Throwable $e) { $actions[]='idx_tasks_subject skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'series_id')) {
      $conn->exec('ALTER TABLE tasks ADD COLUMN series_id BIGINT NULL');
      $actions[] = 'tasks.series_id added';
    }
    if (!indexExists($conn, $db, 'tasks', 'idx_tasks_series')) {
      try { $conn->exec('ALTER TABLE tasks ADD INDEX idx_tasks_series (series_id)'); $actions[] = 'idx_tasks_series added'; } catch (Throwable $e) { $actions[]='idx_tasks_series skipped: '.$e->getMessage(); }
    }

    // 7) Outlook-like fields and flexible metadata
    // location (VARCHAR), reminder_minutes (INT), is_private (TINYINT), meta_json (TEXT), external mapping
    if (!columnExists($conn, $db, 'tasks', 'location')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN location VARCHAR(255) NULL AFTER color'); $actions[] = 'tasks.location added'; } catch (Throwable $e) { $actions[] = 'tasks.location skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'reminder_minutes')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN reminder_minutes INT NULL AFTER location'); $actions[] = 'tasks.reminder_minutes added'; } catch (Throwable $e) { $actions[] = 'tasks.reminder_minutes skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'is_private')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN is_private TINYINT(1) NULL AFTER reminder_minutes'); $actions[] = 'tasks.is_private added'; } catch (Throwable $e) { $actions[] = 'tasks.is_private skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'meta_json')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN meta_json TEXT NULL AFTER is_private'); $actions[] = 'tasks.meta_json added'; } catch (Throwable $e) { $actions[] = 'tasks.meta_json skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'ext_provider')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN ext_provider VARCHAR(32) NULL AFTER meta_json'); $actions[] = 'tasks.ext_provider added'; } catch (Throwable $e) { $actions[] = 'tasks.ext_provider skipped: '.$e->getMessage(); }
    }
    if (!columnExists($conn, $db, 'tasks', 'ext_id')) {
      try { $conn->exec('ALTER TABLE tasks ADD COLUMN ext_id VARCHAR(128) NULL AFTER ext_provider'); $actions[] = 'tasks.ext_id added'; } catch (Throwable $e) { $actions[] = 'tasks.ext_id skipped: '.$e->getMessage(); }
    }
    if (!indexExists($conn, $db, 'tasks', 'idx_tasks_ext')) {
      try { $conn->exec('ALTER TABLE tasks ADD INDEX idx_tasks_ext (ext_provider, ext_id)'); $actions[] = 'idx_tasks_ext added'; } catch (Throwable $e) { $actions[] = 'idx_tasks_ext skipped: '.$e->getMessage(); }
    }
  }

  echo json_encode(['success'=>true, 'actions'=>$actions]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success'=>false, 'message'=>'Migration failed', 'error'=>$e->getMessage(), 'actions'=>$actions]);
}
