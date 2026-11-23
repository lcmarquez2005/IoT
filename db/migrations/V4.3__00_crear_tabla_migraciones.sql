-- =============================================================================
-- MIGRACIÓN V4.3__00: Control de Versiones de Esquema (Schema Migrations)
-- Práctica 4.3 - Plataforma Comercial Multiusuario IoT
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(255) NOT NULL,
    aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exitoso BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
