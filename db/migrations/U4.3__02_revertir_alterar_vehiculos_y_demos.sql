-- =============================================================================
-- ROLLBACK U4.3__02: Revertir Alteraciones en vehiculos y demos
-- =============================================================================
SET @dbname = DATABASE();

-- Revertir demos
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'demos' AND CONSTRAINT_NAME = 'fk_demos_usuario') > 0,
  'ALTER TABLE demos DROP FOREIGN KEY fk_demos_usuario',
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE demos DROP COLUMN IF EXISTS tipo_demo;
ALTER TABLE demos DROP COLUMN IF EXISTS id_usuario;

-- Revertir vehiculos
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND CONSTRAINT_NAME = 'fk_vehiculos_usuario') > 0,
  'ALTER TABLE vehiculos DROP FOREIGN KEY fk_vehiculos_usuario',
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'vehiculos' AND CONSTRAINT_NAME = 'fk_vehiculos_modelo') > 0,
  'ALTER TABLE vehiculos DROP FOREIGN KEY fk_vehiculos_modelo',
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE vehiculos DROP COLUMN IF EXISTS numero_serie;
ALTER TABLE vehiculos DROP COLUMN IF EXISTS estado_comercial;
ALTER TABLE vehiculos DROP COLUMN IF EXISTS id_usuario_propietario;
ALTER TABLE vehiculos DROP COLUMN IF EXISTS id_modelo;
