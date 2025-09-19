<?php
/**
 * Sistema de validação robusta para Produtivus
 * Centraliza todas as validações de input com sanitização
 */

class InputValidator {

    private static $errors = [];

    /**
     * Valida dados de tarefa
     */
    public static function validateTask($data) {
        self::$errors = [];

        // Título obrigatório
        if (empty(trim($data['title'] ?? ''))) {
            self::$errors[] = 'Título é obrigatório';
        } else {
            $title = trim($data['title']);
            if (strlen($title) > 255) {
                self::$errors[] = 'Título muito longo (máximo 255 caracteres)';
            }
            if (strlen($title) < 2) {
                self::$errors[] = 'Título muito curto (mínimo 2 caracteres)';
            }
            // Verificar caracteres suspeitos
            if (preg_match('/<script|javascript:|data:/i', $title)) {
                self::$errors[] = 'Título contém caracteres não permitidos';
            }
        }

        // Descrição opcional mas limitada
        if (isset($data['description'])) {
            $desc = trim($data['description']);
            if (strlen($desc) > 1000) {
                self::$errors[] = 'Descrição muito longa (máximo 1000 caracteres)';
            }
            if (preg_match('/<script|javascript:|data:/i', $desc)) {
                self::$errors[] = 'Descrição contém caracteres não permitidos';
            }
        }

        // Validar datas
        if (!empty($data['start_date'])) {
            if (!self::isValidDateTime($data['start_date'])) {
                self::$errors[] = 'Data de início inválida (use formato ISO 8601)';
            }
        }

        if (!empty($data['end_date'])) {
            if (!self::isValidDateTime($data['end_date'])) {
                self::$errors[] = 'Data de término inválida (use formato ISO 8601)';
            }
        }

        // Validar datas lógicas
        if (!empty($data['start_date']) && !empty($data['end_date'])) {
            $start = strtotime($data['start_date']);
            $end = strtotime($data['end_date']);
            if ($start && $end && $start > $end) {
                self::$errors[] = 'Data de início não pode ser posterior à data de término';
            }
        }

        // Validar cor
        if (!empty($data['color'])) {
            if (!self::isValidColor($data['color'])) {
                self::$errors[] = 'Cor inválida (use formato hexadecimal #RRGGBB)';
            }
        }

        // Validar subject_id
        if (!empty($data['subject_id'])) {
            if (!is_numeric($data['subject_id']) || $data['subject_id'] <= 0) {
                self::$errors[] = 'ID da matéria inválido';
            }
        }

        // Validar campos avançados (se presentes)
        if (!empty($data['location'])) {
            if (strlen($data['location']) > 255) {
                self::$errors[] = 'Localização muito longa (máximo 255 caracteres)';
            }
        }

        if (isset($data['reminder_minutes'])) {
            if (!is_numeric($data['reminder_minutes']) || $data['reminder_minutes'] < 0) {
                self::$errors[] = 'Minutos de lembrete inválidos';
            }
        }

        return empty(self::$errors);
    }

    /**
     * Valida dados de usuário
     */
    public static function validateUser($data, $isUpdate = false) {
        self::$errors = [];

        // Nome
        if (!$isUpdate || isset($data['name'])) {
            $name = trim($data['name'] ?? '');
            if (empty($name)) {
                self::$errors[] = 'Nome é obrigatório';
            } else {
                if (strlen($name) < 2) {
                    self::$errors[] = 'Nome muito curto (mínimo 2 caracteres)';
                }
                if (strlen($name) > 100) {
                    self::$errors[] = 'Nome muito longo (máximo 100 caracteres)';
                }
                if (!preg_match('/^[a-zA-ZÀ-ÿ\s\'-]+$/u', $name)) {
                    self::$errors[] = 'Nome contém caracteres inválidos';
                }
            }
        }

        // Email
        if (!$isUpdate || isset($data['email'])) {
            $email = strtolower(trim($data['email'] ?? ''));
            if (empty($email)) {
                self::$errors[] = 'Email é obrigatório';
            } else {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    self::$errors[] = 'Formato de email inválido';
                }
                if (strlen($email) > 255) {
                    self::$errors[] = 'Email muito longo';
                }
                // Verificar domínios suspeitos
                $suspiciousDomains = ['tempmail.', '10minutemail.', 'guerrillamail.'];
                foreach ($suspiciousDomains as $domain) {
                    if (strpos($email, $domain) !== false) {
                        self::$errors[] = 'Domínio de email não permitido';
                        break;
                    }
                }
            }
        }

        // Senha (apenas para criação ou quando informada)
        if (!$isUpdate || isset($data['password'])) {
            $password = $data['password'] ?? '';
            if (empty($password) && !$isUpdate) {
                self::$errors[] = 'Senha é obrigatória';
            } else if (!empty($password)) {
                if (strlen($password) < 8) {
                    self::$errors[] = 'Senha muito curta (mínimo 8 caracteres)';
                }
                if (strlen($password) > 128) {
                    self::$errors[] = 'Senha muito longa (máximo 128 caracteres)';
                }
                if (!preg_match('/[A-Z]/', $password)) {
                    self::$errors[] = 'Senha deve conter pelo menos uma letra maiúscula';
                }
                if (!preg_match('/[a-z]/', $password)) {
                    self::$errors[] = 'Senha deve conter pelo menos uma letra minúscula';
                }
                if (!preg_match('/\d/', $password)) {
                    self::$errors[] = 'Senha deve conter pelo menos um número';
                }
            }
        }

        return empty(self::$errors);
    }

    /**
     * Sanitiza dados de entrada
     */
    public static function sanitizeInput($data) {
        $sanitized = [];

        foreach ($data as $key => $value) {
            if (is_string($value)) {
                // Remove tags HTML e caracteres especiais
                $value = strip_tags($value);
                $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                $value = trim($value);
            } elseif (is_numeric($value)) {
                $value = filter_var($value, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
            } elseif (is_bool($value)) {
                $value = (bool)$value;
            }

            $sanitized[$key] = $value;
        }

        return $sanitized;
    }

    /**
     * Valida formato de data/hora
     */
    private static function isValidDateTime($datetime) {
        // Aceita formatos ISO 8601: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, etc.
        $patterns = [
            '/^\d{4}-\d{2}-\d{2}$/',                    // YYYY-MM-DD
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/',       // YYYY-MM-DDTHH:MM
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/', // YYYY-MM-DDTHH:MM:SS
            '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/'  // YYYY-MM-DD HH:MM:SS
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $datetime)) {
                // Verificar se a data é válida
                $timestamp = strtotime($datetime);
                return $timestamp !== false && $timestamp > 0;
            }
        }

        return false;
    }

    /**
     * Valida cor hexadecimal
     */
    private static function isValidColor($color) {
        return preg_match('/^#[a-fA-F0-9]{6}$/', $color);
    }

    /**
     * Retorna erros de validação
     */
    public static function getErrors() {
        return self::$errors;
    }

    /**
     * Retorna primeira mensagem de erro
     */
    public static function getFirstError() {
        return empty(self::$errors) ? null : self::$errors[0];
    }

    /**
     * Limita tamanho de string com segurança
     */
    public static function limitString($string, $maxLength) {
        if (strlen($string) <= $maxLength) {
            return $string;
        }
        return mb_substr($string, 0, $maxLength, 'UTF-8') . '...';
    }

    /**
     * Rate limiting básico por IP
     */
    public static function checkRateLimit($identifier, $maxRequests = 60, $timeWindow = 60) {
        $key = 'rate_limit_' . md5($identifier);
        $cacheFile = sys_get_temp_dir() . '/' . $key;

        if (file_exists($cacheFile)) {
            $data = json_decode(file_get_contents($cacheFile), true);
            $now = time();

            // Limpar requisições antigas
            $data['requests'] = array_filter($data['requests'], function($timestamp) use ($now, $timeWindow) {
                return ($now - $timestamp) < $timeWindow;
            });

            if (count($data['requests']) >= $maxRequests) {
                return false; // Rate limit exceeded
            }

            $data['requests'][] = $now;
        } else {
            $data = ['requests' => [time()]];
        }

        file_put_contents($cacheFile, json_encode($data), LOCK_EX);
        return true;
    }
}
?>
