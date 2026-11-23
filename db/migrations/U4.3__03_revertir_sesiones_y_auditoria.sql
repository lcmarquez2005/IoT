-- =============================================================================
-- ROLLBACK U4.3__03: Revertir Sesiones de Invitado y Auditoría
-- =============================================================================
DROP TABLE IF EXISTS sesiones_invitado;
DROP TABLE IF EXISTS auditoria_sistema;
