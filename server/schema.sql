-- Produtivus database schema
-- Run this in your MySQL instance (e.g., HostGator phpMyAdmin)

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Tasks (tarefas) por usuário
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    color VARCHAR(16) NULL,
    done TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_tasks_user (user_id),
    INDEX idx_tasks_dates (start_date, end_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Subtasks (subtarefas) por tarefa
CREATE TABLE IF NOT EXISTS subtasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    text VARCHAR(255) NOT NULL,
    done TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_subtasks_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    INDEX idx_subtasks_task (task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Notebooks (cadernos) por usuário
CREATE TABLE IF NOT EXISTS notebooks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    color VARCHAR(16) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notebooks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notebooks_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Notebook pages (páginas dos cadernos)
CREATE TABLE IF NOT EXISTS notebook_pages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    notebook_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    color VARCHAR(16) NULL,
    content MEDIUMTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pages_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE,
    INDEX idx_pages_notebook (notebook_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;