-- =============================================================================
-- MIGRACIÓN V4.3__03: Tablas de Sesiones de Invitado y Auditoría del Sistema
-- Práctica 4.3 - Plataforma Comercial Multiusuario IoT
-- =============================================================================

-- 1. Tabla de Sesiones Temporales de Invitado (Turnos de Prueba Exclusivos)
CREATE TABLE IF NOT EXISTS sesiones_invitado (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,
    id_vehiculo INT NOT NULL,
    id_usuario INT NULL,
    token_sesion VARCHAR(64) NOT NULL UNIQUE,
    nombre_invitado VARCHAR(100) NOT NULL,
    ip_origen VARCHAR(45) NULL,
    inicia_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMP NOT NULL,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    motivo_terminacion VARCHAR(50) DEFAULT 'EN_CURSO',
    CONSTRAINT fk_sesiones_vehiculo FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo) ON DELETE CASCADE,
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_sesiones_vehiculo_activa (id_vehiculo, activa),
    INDEX idx_sesiones_token (token_sesion),
    INDEX idx_sesiones_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Auditoría del Sistema (Registro de operaciones y seguridad)
CREATE TABLE IF NOT EXISTS auditoria_sistema (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    id_entidad INT NULL,
    detalle JSON NULL,
    ip VARCHAR(45) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    INDEX idx_auditoria_usuario (id_usuario),
    INDEX idx_auditoria_accion (accion),
    INDEX idx_auditoria_fecha (fecha_hora)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
