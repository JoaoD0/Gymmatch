-- GymMatch (trabalho de POO) — schema MySQL
-- Rodar com: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS gymmatch
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE gymmatch;

-- ==========================================================
-- academias
-- ==========================================================
CREATE TABLE IF NOT EXISTS academias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    endereco VARCHAR(255),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- usuarios
-- ==========================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('comum', 'admin') NOT NULL DEFAULT 'comum',
    status ENUM('ativo', 'pausado') NOT NULL DEFAULT 'ativo',
    academia_id INT,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_academia
        FOREIGN KEY (academia_id) REFERENCES academias(id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- perfis (1:1 com usuarios)
-- ==========================================================
CREATE TABLE IF NOT EXISTS perfis (
    usuario_id INT PRIMARY KEY,
    bio VARCHAR(500),
    objetivo ENUM('emagrecer', 'hipertrofia', 'condicionamento', 'saude', 'outro') DEFAULT 'outro',
    nivel ENUM('iniciante', 'intermediario', 'avancado') DEFAULT 'iniciante',
    modalidades VARCHAR(255),
    idade INT,
    -- ---------- onboarding (etapas 1-4) ----------
    telefone VARCHAR(20),
    cpf VARCHAR(14) UNIQUE,
    genero ENUM('masculino', 'feminino', 'nao_binario', 'outro'),
    orientacao_sexual VARCHAR(100),
    procurando ENUM('amizade', 'parceiro_treino', 'romance') DEFAULT 'amizade',
    aberto_a VARCHAR(100),
    mostrar_para VARCHAR(100),
    quando_treina VARCHAR(50),
    divisao_treino VARCHAR(100),
    interesses VARCHAR(255),
    foto_url VARCHAR(255),
    termos_aceitos_em DATETIME,
    -- ---------- privacidade ----------
    ocultar_objetivo BOOLEAN NOT NULL DEFAULT FALSE,
    ocultar_orientacao BOOLEAN NOT NULL DEFAULT FALSE,
    ocultar_horarios BOOLEAN NOT NULL DEFAULT FALSE,
    -- ---------- recordes pessoais (opcionais) ----------
    pr_supino DECIMAL(6,2),
    pr_agachamento DECIMAL(6,2),
    pr_terra DECIMAL(6,2),
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_perfis_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- fotos_perfil (galeria — até 6 por usuário)
-- ==========================================================
CREATE TABLE IF NOT EXISTS fotos_perfil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    posicao INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fotos_perfil_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- boosts (destaque temporário no Discover — simulado, sem pagamento)
-- ==========================================================
CREATE TABLE IF NOT EXISTS boosts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    ativado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    CONSTRAINT fk_boosts_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- assinaturas (planos Gold/Diamond — pagamento simulado, sem gateway real)
-- ==========================================================
CREATE TABLE IF NOT EXISTS assinaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    plano ENUM('gold', 'diamond') NOT NULL,
    iniciada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    cancelada_em DATETIME,
    cartao_final CHAR(4),
    cartao_bandeira VARCHAR(20),
    CONSTRAINT fk_assinaturas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- Nota: se você já tem um banco `gymmatch` criado ANTES destes campos existirem,
-- rode manualmente (uma vez só) o bloco abaixo antes de reimportar este arquivo,
-- já que CREATE TABLE IF NOT EXISTS não recria/altera tabelas já existentes.
--
-- ALTER TABLE usuarios
--     ADD COLUMN status ENUM('ativo', 'pausado') NOT NULL DEFAULT 'ativo';
--
-- ALTER TABLE perfis
--     ADD COLUMN ocultar_objetivo BOOLEAN NOT NULL DEFAULT FALSE,
--     ADD COLUMN ocultar_orientacao BOOLEAN NOT NULL DEFAULT FALSE,
--     ADD COLUMN ocultar_horarios BOOLEAN NOT NULL DEFAULT FALSE,
--     ADD COLUMN pr_supino DECIMAL(6,2),
--     ADD COLUMN pr_agachamento DECIMAL(6,2),
--     ADD COLUMN pr_terra DECIMAL(6,2);
--
-- CREATE TABLE IF NOT EXISTS fotos_perfil (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     usuario_id INT NOT NULL,
--     url VARCHAR(255) NOT NULL,
--     posicao INT NOT NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_fotos_perfil_usuario
--         FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
--         ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS boosts (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     usuario_id INT NOT NULL,
--     ativado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     expira_em DATETIME NOT NULL,
--     CONSTRAINT fk_boosts_usuario
--         FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
--         ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS assinaturas (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     usuario_id INT NOT NULL,
--     plano ENUM('gold', 'diamond') NOT NULL,
--     iniciada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     expira_em DATETIME NOT NULL,
--     cancelada_em DATETIME,
--     cartao_final CHAR(4),
--     cartao_bandeira VARCHAR(20),
--     CONSTRAINT fk_assinaturas_usuario
--         FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
--         ON DELETE CASCADE
-- ) ENGINE=InnoDB;

-- ==========================================================
-- curtidas
-- ==========================================================
CREATE TABLE IF NOT EXISTS curtidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    de_usuario_id INT NOT NULL,
    para_usuario_id INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_curtida (de_usuario_id, para_usuario_id),
    CONSTRAINT fk_curtidas_de FOREIGN KEY (de_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_curtidas_para FOREIGN KEY (para_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_curtida_nao_propria CHECK (de_usuario_id <> para_usuario_id)
) ENGINE=InnoDB;

-- ==========================================================
-- matches
-- ==========================================================
CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario1_id INT NOT NULL,
    usuario2_id INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_match (usuario1_id, usuario2_id),
    CONSTRAINT fk_matches_u1 FOREIGN KEY (usuario1_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_matches_u2 FOREIGN KEY (usuario2_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- mensagens
-- ==========================================================
CREATE TABLE IF NOT EXISTS mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    remetente_id INT NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mensagens_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- recusas (usuário recusou um perfil no Discover / em "Quem curtiu você")
-- ==========================================================
CREATE TABLE IF NOT EXISTS recusas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    de_usuario_id INT NOT NULL,
    para_usuario_id INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_recusa (de_usuario_id, para_usuario_id),
    CONSTRAINT fk_recusas_de FOREIGN KEY (de_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_recusas_para FOREIGN KEY (para_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- bloqueios
-- ==========================================================
CREATE TABLE IF NOT EXISTS bloqueios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bloqueador_id INT NOT NULL,
    bloqueado_id INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bloqueio (bloqueador_id, bloqueado_id),
    CONSTRAINT fk_bloqueios_bloqueador FOREIGN KEY (bloqueador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_bloqueios_bloqueado FOREIGN KEY (bloqueado_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- moves (stories de treino — somem depois de 24h)
-- ==========================================================
CREATE TABLE IF NOT EXISTS moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    texto VARCHAR(150) NOT NULL,
    foto_url VARCHAR(255) NOT NULL,
    tag VARCHAR(40),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    CONSTRAINT fk_moves_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_moves_usuario (usuario_id),
    INDEX idx_moves_expira (expira_em)
) ENGINE=InnoDB;

-- ==========================================================
-- posts (mural da academia)
-- ==========================================================
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    autor_id INT NOT NULL,
    academia_id INT NOT NULL,
    tipo ENUM('manual', 'pr', 'checkin') NOT NULL DEFAULT 'manual',
    texto VARCHAR(500),
    foto_url VARCHAR(255),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE,
    INDEX idx_posts_academia_criado (academia_id, criado_em)
) ENGINE=InnoDB;

-- ==========================================================
-- curtidas_post
-- ==========================================================
CREATE TABLE IF NOT EXISTS curtidas_post (
    post_id INT NOT NULL,
    usuario_id INT NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, usuario_id),
    CONSTRAINT fk_curtidas_post_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_curtidas_post_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- denuncias
-- ==========================================================
CREATE TABLE IF NOT EXISTS denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    denunciante_id INT NOT NULL,
    denunciado_id INT NOT NULL,
    motivo ENUM('assedio', 'linguagem_ofensiva', 'comportamento_inadequado', 'perfil_falso', 'spam', 'racismo') NOT NULL,
    move_id INT NULL,
    post_id INT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_denuncia_move (denunciante_id, move_id),
    UNIQUE KEY uq_denuncia_post (denunciante_id, post_id),
    CONSTRAINT fk_denuncias_denunciante FOREIGN KEY (denunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_denuncias_denunciado FOREIGN KEY (denunciado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_denuncias_move FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE SET NULL,
    CONSTRAINT fk_denuncias_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- plano_semanal (descrição do treino de cada dia)
-- ==========================================================
CREATE TABLE IF NOT EXISTS plano_semanal (
    usuario_id INT NOT NULL,
    dia ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom') NOT NULL,
    descricao VARCHAR(60) NOT NULL DEFAULT '',
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, dia),
    CONSTRAINT fk_plano_semanal_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- exercicios (lista de exercícios de cada dia da semana)
-- ==========================================================
CREATE TABLE IF NOT EXISTS exercicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    dia ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom') NOT NULL,
    nome VARCHAR(60) NOT NULL,
    series TINYINT NULL,
    reps TINYINT NULL,
    posicao INT NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exercicios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_exercicios_usuario_dia (usuario_id, dia, posicao)
) ENGINE=InnoDB;

-- ==========================================================
-- checkins (um por usuário; vale por 3h)
-- ==========================================================
CREATE TABLE IF NOT EXISTS checkins (
    usuario_id INT PRIMARY KEY,
    feito_em DATETIME NOT NULL,
    CONSTRAINT fk_checkins_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- convites_treino (convite 1 a 1 entre matches; horário guardado em hora local)
-- ==========================================================
CREATE TABLE IF NOT EXISTS convites_treino (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remetente_id INT NOT NULL,
    destinatario_id INT NOT NULL,
    academia_id INT NOT NULL,
    agendado_para DATETIME NOT NULL,
    status ENUM('pendente', 'aceito', 'recusado', 'cancelado') NOT NULL DEFAULT 'pendente',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respondido_em DATETIME NULL,
    CONSTRAINT fk_convites_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_convites_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- sessoes_grupo / sessao_membros (grupo de treino com 1 a 4 convidados)
-- ==========================================================
CREATE TABLE IF NOT EXISTS sessoes_grupo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    criador_id INT NOT NULL,
    academia_id INT NOT NULL,
    agendada_para DATETIME NOT NULL,
    descricao VARCHAR(120) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessoes_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessoes_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessao_membros (
    sessao_id INT NOT NULL,
    usuario_id INT NOT NULL,
    status ENUM('pendente', 'aceito', 'recusado', 'cancelado') NOT NULL DEFAULT 'pendente',
    respondido_em DATETIME NULL,
    PRIMARY KEY (sessao_id, usuario_id),
    CONSTRAINT fk_sessao_membros_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes_grupo(id) ON DELETE CASCADE,
    CONSTRAINT fk_sessao_membros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Nota: se você já tem um banco `gymmatch` criado ANTES destes campos existirem,
-- rode manualmente (uma vez só) o bloco abaixo antes de reimportar este arquivo.
--
-- ALTER TABLE matches
--     ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;
--
-- CREATE TABLE IF NOT EXISTS recusas (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     de_usuario_id INT NOT NULL,
--     para_usuario_id INT NOT NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE KEY uq_recusa (de_usuario_id, para_usuario_id),
--     CONSTRAINT fk_recusas_de FOREIGN KEY (de_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_recusas_para FOREIGN KEY (para_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS bloqueios (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     bloqueador_id INT NOT NULL,
--     bloqueado_id INT NOT NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE KEY uq_bloqueio (bloqueador_id, bloqueado_id),
--     CONSTRAINT fk_bloqueios_bloqueador FOREIGN KEY (bloqueador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_bloqueios_bloqueado FOREIGN KEY (bloqueado_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS moves (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     usuario_id INT NOT NULL,
--     texto VARCHAR(150) NOT NULL,
--     foto_url VARCHAR(255) NOT NULL,
--     tag VARCHAR(40),
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     expira_em DATETIME NOT NULL,
--     CONSTRAINT fk_moves_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     INDEX idx_moves_usuario (usuario_id),
--     INDEX idx_moves_expira (expira_em)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS posts (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     autor_id INT NOT NULL,
--     academia_id INT NOT NULL,
--     tipo ENUM('manual', 'pr', 'checkin') NOT NULL DEFAULT 'manual',
--     texto VARCHAR(500),
--     foto_url VARCHAR(255),
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_posts_autor FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_posts_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE,
--     INDEX idx_posts_academia_criado (academia_id, criado_em)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS curtidas_post (
--     post_id INT NOT NULL,
--     usuario_id INT NOT NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY (post_id, usuario_id),
--     CONSTRAINT fk_curtidas_post_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
--     CONSTRAINT fk_curtidas_post_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS denuncias (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     denunciante_id INT NOT NULL,
--     denunciado_id INT NOT NULL,
--     motivo ENUM('assedio', 'linguagem_ofensiva', 'comportamento_inadequado', 'perfil_falso', 'spam', 'racismo') NOT NULL,
--     move_id INT NULL,
--     post_id INT NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE KEY uq_denuncia_move (denunciante_id, move_id),
--     UNIQUE KEY uq_denuncia_post (denunciante_id, post_id),
--     CONSTRAINT fk_denuncias_denunciante FOREIGN KEY (denunciante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_denuncias_denunciado FOREIGN KEY (denunciado_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_denuncias_move FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE SET NULL,
--     CONSTRAINT fk_denuncias_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
-- ) ENGINE=InnoDB;
--
-- -- se a tabela `denuncias` já existir sem as colunas `move_id`/`post_id`:
-- ALTER TABLE denuncias
--     ADD COLUMN move_id INT NULL,
--     ADD COLUMN post_id INT NULL,
--     ADD CONSTRAINT fk_denuncias_move FOREIGN KEY (move_id) REFERENCES moves(id) ON DELETE SET NULL,
--     ADD CONSTRAINT fk_denuncias_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
--     ADD UNIQUE KEY uq_denuncia_move (denunciante_id, move_id),
--     ADD UNIQUE KEY uq_denuncia_post (denunciante_id, post_id);
--
-- -- tela de Treino (plano da semana, exercícios, check-in, convites e grupos):
-- CREATE TABLE IF NOT EXISTS plano_semanal (
--     usuario_id INT NOT NULL,
--     dia ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom') NOT NULL,
--     descricao VARCHAR(60) NOT NULL DEFAULT '',
--     atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     PRIMARY KEY (usuario_id, dia),
--     CONSTRAINT fk_plano_semanal_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS exercicios (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     usuario_id INT NOT NULL,
--     dia ENUM('seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom') NOT NULL,
--     nome VARCHAR(60) NOT NULL,
--     series TINYINT NULL,
--     reps TINYINT NULL,
--     posicao INT NOT NULL DEFAULT 0,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_exercicios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     INDEX idx_exercicios_usuario_dia (usuario_id, dia, posicao)
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS checkins (
--     usuario_id INT PRIMARY KEY,
--     feito_em DATETIME NOT NULL,
--     CONSTRAINT fk_checkins_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS convites_treino (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     remetente_id INT NOT NULL,
--     destinatario_id INT NOT NULL,
--     academia_id INT NOT NULL,
--     agendado_para DATETIME NOT NULL,
--     status ENUM('pendente', 'aceito', 'recusado', 'cancelado') NOT NULL DEFAULT 'pendente',
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     respondido_em DATETIME NULL,
--     CONSTRAINT fk_convites_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_convites_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_convites_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS sessoes_grupo (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     criador_id INT NOT NULL,
--     academia_id INT NOT NULL,
--     agendada_para DATETIME NOT NULL,
--     descricao VARCHAR(120) NULL,
--     criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT fk_sessoes_criador FOREIGN KEY (criador_id) REFERENCES usuarios(id) ON DELETE CASCADE,
--     CONSTRAINT fk_sessoes_academia FOREIGN KEY (academia_id) REFERENCES academias(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;
--
-- CREATE TABLE IF NOT EXISTS sessao_membros (
--     sessao_id INT NOT NULL,
--     usuario_id INT NOT NULL,
--     status ENUM('pendente', 'aceito', 'recusado', 'cancelado') NOT NULL DEFAULT 'pendente',
--     respondido_em DATETIME NULL,
--     PRIMARY KEY (sessao_id, usuario_id),
--     CONSTRAINT fk_sessao_membros_sessao FOREIGN KEY (sessao_id) REFERENCES sessoes_grupo(id) ON DELETE CASCADE,
--     CONSTRAINT fk_sessao_membros_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB;

-- ==========================================================
-- dados de exemplo (opcional, útil para testar/apresentar)
-- ==========================================================
INSERT INTO academias (nome, endereco) VALUES
    ('Academia Central', 'Rua das Flores, 100'),
    ('PowerGym', 'Av. Brasil, 500');
