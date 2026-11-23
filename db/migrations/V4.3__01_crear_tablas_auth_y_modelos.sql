-- =============================================================================
-- MIGRACIÓN V4.3__01: Tablas de Roles, Usuarios (RBAC) y Modelos Comerciales
-- Práctica 4.3 - Plataforma Comercial Multiusuario IoT
-- =============================================================================

-- 1. Tabla de Roles (ADMINISTRADOR, USUARIO, INVITADO)
CREATE TABLE IF NOT EXISTS roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Usuarios y Clientes
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    telefono VARCHAR(30) NULL,
    empresa VARCHAR(100) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol) ON UPDATE CASCADE,
    INDEX idx_usuarios_rol (id_rol),
    INDEX idx_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Modelos Comerciales (Catálogo Comercial independiente de la Unidad Física)
CREATE TABLE IF NOT EXISTS modelos_vehiculo (
    id_modelo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    categoria VARCHAR(50) NOT NULL DEFAULT 'EXCAVADORA',
    descripcion TEXT NULL,
    especificaciones JSON NULL,
    foto_url VARCHAR(255) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_modelos_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
