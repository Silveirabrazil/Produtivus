-- Migration: add user_profiles table (extended user profile data)
-- Date: 2025-09-26

-- Create table if not exists (MySQL flavor)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT NOT NULL,
  avatar TEXT NULL,
  birth DATE NULL,
  gender ENUM('F','M','O','N') NULL,
  marital ENUM('solteiro','casado','divorciado','viuvo') NULL,
  nationality VARCHAR(100) NULL,
  birthplace VARCHAR(120) NULL,
  cpf VARCHAR(20) NULL,
  street VARCHAR(160) NULL,
  number VARCHAR(20) NULL,
  complement VARCHAR(120) NULL,
  neighborhood VARCHAR(120) NULL,
  zip VARCHAR(20) NULL,
  city VARCHAR(120) NULL,
  state CHAR(2) NULL,
  phone VARCHAR(30) NULL,
  mobile VARCHAR(30) NULL,
  emergency VARCHAR(160) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_user_profiles PRIMARY KEY (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- If your MySQL doesn't support ENUM in your host, you can adapt as VARCHAR(20) for gender/marital.
