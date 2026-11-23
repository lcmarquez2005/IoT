-- =============================================================================
-- MIGRACIÓN V4.3__04: Seed de Datos Iniciales y Vinculación
-- Práctica 4.3 - Plataforma Comercial Multiusuario IoT
-- =============================================================================

-- 1. Insertar Roles Principales
INSERT INTO roles (id_rol, nombre, descripcion) VALUES
(1, 'ADMINISTRADOR', 'Administrador de empresa comercializadora IoT (gestión completa)'),
(2, 'USUARIO', 'Cliente comprador con acceso exclusivo a sus unidades y editor de demos'),
(3, 'INVITADO', 'Visitante comercial con acceso a catálogo y pruebas temporales')
ON DUPLICATE KEY UPDATE descripcion=VALUES(descripcion);

-- 2. Insertar Usuarios Semilla con contraseñas seguras bcrypt:
-- Admin123!   -> $2b$12$.JGZ8Sb2I0qDebPrTABXgeNpHyPjZHuIhjbD.RxmWL/.VslgyQk1a
-- Cliente123! -> $2b$12$Ex0bDE.Mw2cJZFZXysD0venGSNVoOgtJNXxeyVtjIrJI90I63.nYO
-- Invitado123!-> $2b$12$JmCKt1OZNrLr3yj8adoRv.u/sBl9j0CrmLG6rCfuHYj6yh6BgYjiC
INSERT INTO usuarios (id_usuario, nombre, email, password_hash, id_rol, empresa, activo) VALUES
(1, 'Administrador Comercial', 'admin@empresa-iot.com', '$2b$12$.JGZ8Sb2I0qDebPrTABXgeNpHyPjZHuIhjbD.RxmWL/.VslgyQk1a', 1, 'IoT Heavy Machinery S.A.', TRUE),
(2, 'Ing. Carlos Mendoza (Cliente)', 'cliente@gmail.com', '$2b$12$Ex0bDE.Mw2cJZFZXysD0venGSNVoOgtJNXxeyVtjIrJI90I63.nYO', 2, 'Constructora del Norte', TRUE),
(3, 'Visitante Demo (Invitado)', 'invitado@publico.com', '$2b$12$JmCKt1OZNrLr3yj8adoRv.u/sBl9j0CrmLG6rCfuHYj6yh6BgYjiC', 3, 'Prospecto Particular', TRUE)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), id_rol=VALUES(id_rol);

-- 3. Insertar Modelos Comerciales en el Catálogo
INSERT INTO modelos_vehiculo (id_modelo, nombre, categoria, descripcion, especificaciones, foto_url, activo) VALUES
(1, 'Excavadora Hidráulica X-200', 'EXCAVADORA', 
 'Excavadora a escala robótica industrial con brazo triple articulado, rotación 360°, tracción de orugas dobles y microcontrolador ESP32 dual-core con enlace WSS en tiempo real.',
 '{"peso_kg": 4.5, "alcance_brazo_cm": 45, "bateria": "LiPo 3S 11.1V 2200mAh", "canales_pwm": 6, "conectividad": "WiFi 802.11 b/g/n + WSS"}',
 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80', TRUE),
(2, 'Rover Explorador Todoterreno RT-4', 'EXPLORADOR',
 'Vehículo autónomo y teledirigido 4x4 con suspensión basculante, sensores ultrasónicos frontales, telemetría de obstáculos y cámara integrada.',
 '{"peso_kg": 2.1, "traccion": "4WD", "bateria": "Li-Ion 7.4V 3000mAh", "sensores": ["Ultrasonico HC-SR04", "Giroscopio MPU6050"], "conectividad": "WiFi + WSS"}',
 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80', TRUE)
ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), categoria=VALUES(categoria), descripcion=VALUES(descripcion);

-- 4. Actualizar la Unidad Física Existente (ID 1)
-- Asignarla al Modelo 1 (Excavadora X-200), Estado EXHIBICION, y N° Serie único
UPDATE vehiculos
   SET id_modelo = 1,
       estado_comercial = 'EXHIBICION',
       numero_serie = 'EXC-X200-001',
       id_usuario_propietario = NULL
 WHERE id_vehiculo = 1;

-- 5. Actualizar la Demo Existente (ID 1) como Demo de Fábrica
UPDATE demos
   SET tipo_demo = 'FABRICA',
       id_usuario = NULL
 WHERE id_demo = 1;

-- 6. Registrar en Auditoría la Inicialización del Módulo 4.3
INSERT INTO auditoria_sistema (id_usuario, accion, entidad, id_entidad, detalle, ip) VALUES
(1, 'SISTEMA_INICIALIZADO', 'sistema', 1, '{"evento": "Migración 4.3 completada con éxito", "version": "4.3.0"}', '127.0.0.1');
