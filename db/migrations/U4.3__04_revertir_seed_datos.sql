-- =============================================================================
-- ROLLBACK U4.3__04: Revertir Datos Semilla de Práctica 4.3
-- =============================================================================
DELETE FROM auditoria_sistema WHERE accion = 'SISTEMA_INICIALIZADO';
UPDATE demos SET tipo_demo = 'FABRICA', id_usuario = NULL WHERE id_demo = 1;
UPDATE vehiculos SET id_modelo = NULL, estado_comercial = 'EXHIBICION', numero_serie = NULL, id_usuario_propietario = NULL WHERE id_vehiculo = 1;
DELETE FROM usuarios WHERE email IN ('admin@empresa-iot.com', 'cliente@gmail.com', 'invitado@publico.com');
DELETE FROM modelos_vehiculo WHERE id_modelo IN (1, 2);
DELETE FROM roles WHERE id_rol IN (1, 2, 3);
