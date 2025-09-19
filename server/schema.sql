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
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    color VARCHAR(16) NULL,
    subject_id BIGINT NULL,
    series_id BIGINT NULL,
    done TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_tasks_user (user_id),
    INDEX idx_tasks_dates (start_date, end_date),
    INDEX idx_tasks_subject (subject_id),
    INDEX idx_tasks_series (series_id)
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
    subject_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notebooks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notebooks_user (user_id),
    INDEX idx_notebooks_subject (subject_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Conteúdo dos cadernos (páginas)
CREATE TABLE IF NOT EXISTS notebook_contents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    notebook_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    content LONGTEXT NOT NULL,
    format ENUM('html', 'markdown', 'vue-editor', 'json') DEFAULT 'html',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_notebook_contents_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks (id) ON DELETE CASCADE,
    CONSTRAINT fk_notebook_contents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_notebook_contents_notebook (notebook_id),
    INDEX idx_notebook_contents_user (user_id),
    INDEX idx_notebook_contents_updated (updated_at)
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

    -- Subjects (matérias de estudo) por usuário
    CREATE TABLE IF NOT EXISTS study_subjects (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(120) NOT NULL,
        color VARCHAR(16) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_subjects_user (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Courses (cursos) por usuário
CREATE TABLE IF NOT EXISTS study_courses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(160) NOT NULL,
    color VARCHAR(16) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_courses_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Vínculo: matéria -> curso (opcional)
ALTER TABLE study_subjects
    ADD COLUMN course_id BIGINT NULL,
    ADD INDEX idx_subjects_course (course_id);
-- FK opcional (pode ser omitido em alguns hosts); se falhar, ignore ao aplicar manualmente
ALTER TABLE study_subjects
    ADD CONSTRAINT fk_subjects_course FOREIGN KEY (course_id) REFERENCES study_courses (id) ON DELETE SET NULL;

-- Vínculo: caderno -> matéria (opcional)
-- subject_id já existe em notebooks; manter apenas a FK opcional
ALTER TABLE notebooks
    ADD CONSTRAINT fk_notebooks_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL;

-- Vínculo: página do caderno -> matéria (opcional)
ALTER TABLE notebook_pages
    ADD COLUMN subject_id BIGINT NULL,
    ADD INDEX idx_pages_subject (subject_id);
-- FK opcional
ALTER TABLE notebook_pages
    ADD CONSTRAINT fk_pages_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL;

-- Planner semanal de estudos
CREATE TABLE IF NOT EXISTS study_plan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_id BIGINT NULL,
    title VARCHAR(255) NULL,
    color VARCHAR(16) NULL,
    day_of_week TINYINT NOT NULL, -- 0=Domingo, 1=Segunda, ..., 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_sp_user_dow (user_id, day_of_week)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- FK opcional para matéria (pode falhar em alguns hosts)
ALTER TABLE study_plan
    ADD INDEX idx_sp_subject (subject_id);
ALTER TABLE study_plan
    ADD CONSTRAINT fk_sp_subject FOREIGN KEY (subject_id) REFERENCES study_subjects (id) ON DELETE SET NULL;
