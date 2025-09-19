<?php
/**
 * Sistema de mock para banco de dados em desenvolvimento
 * Simula operações PDO usando arquivos JSON
 */

class MockDatabase {
    private $dataFile;
    private $data;

    public function __construct() {
        $dataDir = __DIR__ . '/../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }

        $this->dataFile = $dataDir . '/mock_database.json';
        $this->loadData();
        $this->initializeDefaultData();
    }

    private function loadData() {
        if (file_exists($this->dataFile)) {
            $this->data = json_decode(file_get_contents($this->dataFile), true) ?: [];
        } else {
            $this->data = ['users' => [], 'tasks' => []];
        }
    }

    private function saveData() {
        file_put_contents($this->dataFile, json_encode($this->data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    private function initializeDefaultData() {
        // Criar usuário padrão se não existir
        if (empty($this->data['users'])) {
            $this->data['users'] = [
                [
                    'id' => 1,
                    'name' => 'Admin',
                    'email' => 'admin@produtivus.local',
                    'password' => password_hash('admin123', PASSWORD_DEFAULT),
                    'created_at' => date('Y-m-d H:i:s')
                ]
            ];
            $this->saveData();
        }
    }

    public function prepare($sql) {
        return new MockPDOStatement($this, $sql);
    }

    public function query($sql) {
        $stmt = $this->prepare($sql);
        $stmt->execute();
        return $stmt;
    }

    public function exec($sql) {
        $stmt = $this->prepare($sql);
        return $stmt->execute();
    }

    public function getUsers() {
        return $this->data['users'] ?? [];
    }

    public function getTasks() {
        return $this->data['tasks'] ?? [];
    }

    public function addUser($user) {
        if (!isset($this->data['users'])) {
            $this->data['users'] = [];
        }
        $user['id'] = count($this->data['users']) + 1;
        $this->data['users'][] = $user;
        $this->saveData();
        return $user['id'];
    }

    public function addTask($task) {
        if (!isset($this->data['tasks'])) {
            $this->data['tasks'] = [];
        }
        $task['id'] = count($this->data['tasks']) + 1;
        $this->data['tasks'][] = $task;
        $this->saveData();
        return $task['id'];
    }

    public function updateUser($id, $data) {
        foreach ($this->data['users'] as &$user) {
            if ($user['id'] == $id) {
                $user = array_merge($user, $data);
                $this->saveData();
                return true;
            }
        }
        return false;
    }

    public function updateTask($id, $data) {
        foreach ($this->data['tasks'] as &$task) {
            if ($task['id'] == $id) {
                $task = array_merge($task, $data);
                $this->saveData();
                return true;
            }
        }
        return false;
    }
}

class MockPDOStatement {
    private $db;
    private $sql;
    private $params = [];
    private $result = [];

    public function __construct($db, $sql) {
        $this->db = $db;
        $this->sql = $sql;
    }

    public function execute($params = []) {
        $this->params = $params ?: $this->params;

        // Simular queries básicas
        if (preg_match('/SELECT.*FROM users.*WHERE id = :id/i', $this->sql)) {
            $id = $this->params[':id'] ?? null;
            $users = $this->db->getUsers();
            $this->result = array_filter($users, function($user) use ($id) {
                return $user['id'] == $id;
            });
        } elseif (preg_match('/SELECT.*FROM users.*WHERE email = :email/i', $this->sql)) {
            $email = $this->params[':email'] ?? null;
            $users = $this->db->getUsers();
            $this->result = array_filter($users, function($user) use ($email) {
                return $user['email'] == $email;
            });
        } elseif (preg_match('/SELECT.*FROM tasks.*WHERE user_id = :user_id/i', $this->sql)) {
            $userId = $this->params[':user_id'] ?? null;
            $tasks = $this->db->getTasks();
            $this->result = array_filter($tasks, function($task) use ($userId) {
                return $task['user_id'] == $userId;
            });
        } elseif (preg_match('/SELECT.*FROM tasks/i', $this->sql)) {
            $this->result = $this->db->getTasks();
        } elseif (preg_match('/SELECT.*FROM users/i', $this->sql)) {
            $this->result = $this->db->getUsers();
        }

        return true;
    }

    public function fetch($mode = null) {
        $result = array_shift($this->result);
        return $result ?: false;
    }

    public function fetchAll($mode = null) {
        return array_values($this->result);
    }

    public function fetchColumn() {
        $row = $this->fetch();
        return $row ? array_values($row)[0] : false;
    }

    public function rowCount() {
        return count($this->result);
    }

    public function bindParam($param, $value) {
        $this->params[$param] = $value;
        return true;
    }

    public function bindValue($param, $value) {
        $this->params[$param] = $value;
        return true;
    }
}

// Constantes PDO para compatibilidade
if (!defined('PDO::FETCH_ASSOC')) {
    define('PDO::FETCH_ASSOC', 1);
}
