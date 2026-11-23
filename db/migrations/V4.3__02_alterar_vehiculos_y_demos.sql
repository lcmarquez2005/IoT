-- =============================================================================
-- MIGRACIÓN V4.3__02: Ampliación de Tablas Vehículos y Demos
-- Práctica 4.3 - Plataforma Comercial Multiusuario IoT
-- Conserva 100% de compatibilidad con datos históricos y Stored Procedures
-- =============================================================================

-- 1. Ampliar vehiculos con id_modelo, propietario, estado comercial y número de serie
SET @dbname = DATABASE();

-- Columna id_modelo
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'id_modelo') > 0,
  'SELECT 1',
  'ALTER TABLE vehiculos ADD COLUMN id_modelo INT NULL AFTER nombre'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna id_usuario_propietario
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'id_usuario_propietario') > 0,
  'SELECT 1',
  'ALTER TABLE vehiculos ADD COLUMN id_usuario_propietario INT NULL AFTER id_modelo'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna estado_comercial
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'estado_comercial') > 0,
  'SELECT 1',
  "ALTER TABLE vehiculos ADD COLUMN estado_comercial ENUM('DISPONIBLE', 'VENDIDO', 'EXHIBICION', 'MANTENIMIENTO') NOT NULL DEFAULT 'EXHIBICION' AFTER microcontrolador"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna numero_serie
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND COLUMN_NAME = 'numero_serie') > 0,
  'SELECT 1',
  'ALTER TABLE vehiculos ADD COLUMN numero_serie VARCHAR(50) NULL UNIQUE AFTER estado_comercial'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Llave foránea fk_vehiculos_modelo
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND CONSTRAINT_NAME = 'fk_vehiculos_modelo') > 0,
  'SELECT 1',
  'ALTER TABLE vehiculos ADD CONSTRAINT fk_vehiculos_modelo FOREIGN KEY (id_modelo) REFERENCES modelos_vehiculo(id_modelo) ON DELETE SET NULL ON UPDATE CASCADE'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Llave foránea fk_vehiculos_usuario
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND CONSTRAINT_NAME = 'fk_vehiculos_usuario') > 0,
  'SELECT 1',
  'ALTER TABLE vehiculos ADD CONSTRAINT fk_vehiculos_usuario FOREIGN KEY (id_usuario_propietario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ampliar demos con id_usuario y tipo_demo ('FABRICA', 'PRIVADA')
-- Columna id_usuario
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'demos' AND COLUMN_NAME = 'id_usuario') > 0,
  'SELECT 1',
  'ALTER TABLE demos ADD COLUMN id_usuario INT NULL AFTER id_vehiculo'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Columna tipo_demo
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'demos' AND COLUMN_NAME = 'tipo_demo') > 0,
  'SELECT 1',
  "ALTER TABLE demos ADD COLUMN tipo_demo ENUM('FABRICA', 'PRIVADA') NOT NULL DEFAULT 'FABRICA' AFTER id_usuario"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Llave foránea fk_demos_usuario
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'demos' AND CONSTRAINT_NAME = 'fk_demos_usuario') > 0,
  'SELECT 1',
  'ALTER TABLE demos ADD CONSTRAINT fk_demos_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL ON UPDATE CASCADE'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
