2. Crear la base de datos y las tablas por script


4

Crea la base de datos y las seis tablas

Copia y ejecuta el siguiente script completo. Analiza cada PRIMARY KEY, FOREIGN KEY, UNIQUE y regla ON DELETE antes de ejecutarlo.

CREATE DATABASE IF NOT EXISTS vehiculo_iot

  CHARACTER SET utf8mb4

  COLLATE utf8mb4_0900_ai_ci;


USE vehiculo_iot;


CREATE TABLE vehiculos (

    id_vehiculo INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(80) NOT NULL,

    modelo VARCHAR(80),

    descripcion VARCHAR(255),

    microcontrolador VARCHAR(50),

    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    activo BOOLEAN NOT NULL DEFAULT TRUE

);


CREATE TABLE comandos (

    id_comando INT AUTO_INCREMENT PRIMARY KEY,

    id_vehiculo INT NOT NULL,

    nombre VARCHAR(60) NOT NULL,

    codigo INT NOT NULL,

    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_comando_codigo UNIQUE (id_vehiculo, codigo),

    CONSTRAINT uq_comando_nombre UNIQUE (id_vehiculo, nombre),

    CONSTRAINT fk_comando_vehiculo

      FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)

      ON DELETE CASCADE ON UPDATE CASCADE

);


CREATE TABLE estado_vehiculo (

    id_estado INT AUTO_INCREMENT PRIMARY KEY,

    id_vehiculo INT NOT NULL UNIQUE,

    id_comando INT NULL,

    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP

      ON UPDATE CURRENT_TIMESTAMP,

    conectado BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_estado_vehiculo

      FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)

      ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_estado_comando

      FOREIGN KEY (id_comando) REFERENCES comandos(id_comando)

      ON DELETE SET NULL ON UPDATE CASCADE

);


CREATE TABLE historial_comandos (

    id_historial BIGINT AUTO_INCREMENT PRIMARY KEY,

    id_vehiculo INT NOT NULL,

    id_comando INT NULL,

    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    origen VARCHAR(30) NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT fk_historial_vehiculo

      FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)

      ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_historial_comando

      FOREIGN KEY (id_comando) REFERENCES comandos(id_comando)

      ON DELETE SET NULL ON UPDATE CASCADE

);


CREATE TABLE demos (

    id_demo INT AUTO_INCREMENT PRIMARY KEY,

    id_vehiculo INT NOT NULL,

    nombre VARCHAR(80) NOT NULL,

    descripcion VARCHAR(255),

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_demo_vehiculo

      FOREIGN KEY (id_vehiculo) REFERENCES vehiculos(id_vehiculo)

      ON DELETE CASCADE ON UPDATE CASCADE

);


CREATE TABLE demo_movimientos (

    id_demo_movimiento INT AUTO_INCREMENT PRIMARY KEY,

    id_demo INT NOT NULL,

    id_comando INT NOT NULL,

    orden INT NOT NULL,

    duracion_ms INT UNSIGNED NOT NULL,

    pausa_ms INT UNSIGNED NOT NULL DEFAULT 0,

    CONSTRAINT uq_demo_orden UNIQUE (id_demo, orden),

    CONSTRAINT fk_mov_demo

      FOREIGN KEY (id_demo) REFERENCES demos(id_demo)

      ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_mov_comando

      FOREIGN KEY (id_comando) REFERENCES comandos(id_comando)

      ON DELETE RESTRICT ON UPDATE CASCADE

);

5

Verifica la estructura creada

Actualiza el panel SCHEMAS y verifica que aparezca vehiculo_iot con las tablas vehiculos, comandos, estado_vehiculo, historial_comandos, demos y demo_movimientos. Ejecuta también SHOW TABLES; y DESCRIBE nombre_tabla; para revisar la estructura.

6

Analiza las relaciones

Identifica en el script las PRIMARY KEY, FOREIGN KEY, restricciones UNIQUE y las reglas ON DELETE / ON UPDATE. Explica cómo se relacionan vehiculos, comandos, estado_vehiculo, historial_comandos, demos y demo_movimientos.


3. Crear los Stored Procedures


7

Crea los Stored Procedures

Ejecuta el siguiente bloque. Los procedimientos serán los mismos para todos los integrantes del grupo y constituirán el contrato común entre la futura API y la base de datos.

DELIMITER $$

CREATE PROCEDURE sp_crear_vehiculo(

    IN p_nombre VARCHAR(80),

    IN p_modelo VARCHAR(80),

    IN p_descripcion VARCHAR(255),

    IN p_microcontrolador VARCHAR(50)

)

BEGIN

    INSERT INTO vehiculos(nombre, modelo, descripcion, microcontrolador)

    VALUES(p_nombre, p_modelo, p_descripcion, p_microcontrolador);

    SELECT LAST_INSERT_ID() AS id_vehiculo;

END$$


CREATE PROCEDURE sp_obtener_vehiculos()

BEGIN

    SELECT * FROM vehiculos ORDER BY id_vehiculo;

END$$


CREATE PROCEDURE sp_obtener_vehiculo(IN p_id_vehiculo INT)

BEGIN

    SELECT * FROM vehiculos WHERE id_vehiculo = p_id_vehiculo;

END$$


CREATE PROCEDURE sp_actualizar_vehiculo(

    IN p_id_vehiculo INT,

    IN p_nombre VARCHAR(80),

    IN p_modelo VARCHAR(80),

    IN p_descripcion VARCHAR(255),

    IN p_microcontrolador VARCHAR(50),

    IN p_activo BOOLEAN

)

BEGIN

    UPDATE vehiculos

       SET nombre=p_nombre, modelo=p_modelo, descripcion=p_descripcion,

           microcontrolador=p_microcontrolador, activo=p_activo

     WHERE id_vehiculo=p_id_vehiculo;

END$$


CREATE PROCEDURE sp_eliminar_vehiculo(IN p_id_vehiculo INT)

BEGIN

    DELETE FROM vehiculos WHERE id_vehiculo=p_id_vehiculo;

END$$


CREATE PROCEDURE sp_crear_comando(

    IN p_id_vehiculo INT,

    IN p_nombre VARCHAR(60),

    IN p_codigo INT,

    IN p_descripcion VARCHAR(255)

)

BEGIN

    INSERT INTO comandos(id_vehiculo,nombre,codigo,descripcion)

    VALUES(p_id_vehiculo,p_nombre,p_codigo,p_descripcion);

    SELECT LAST_INSERT_ID() AS id_comando;

END$$


CREATE PROCEDURE sp_obtener_comandos_vehiculo(IN p_id_vehiculo INT)

BEGIN

    SELECT * FROM comandos

     WHERE id_vehiculo=p_id_vehiculo

     ORDER BY codigo;

END$$


CREATE PROCEDURE sp_actualizar_comando(

    IN p_id_comando INT,

    IN p_nombre VARCHAR(60),

    IN p_codigo INT,

    IN p_descripcion VARCHAR(255),

    IN p_activo BOOLEAN

)

BEGIN

    UPDATE comandos

       SET nombre=p_nombre, codigo=p_codigo,

           descripcion=p_descripcion, activo=p_activo

     WHERE id_comando=p_id_comando;

END$$


CREATE PROCEDURE sp_eliminar_comando(IN p_id_comando INT)

BEGIN

    DELETE FROM comandos WHERE id_comando=p_id_comando;

END$$


CREATE PROCEDURE sp_actualizar_estado(

    IN p_id_vehiculo INT,

    IN p_id_comando INT,

    IN p_conectado BOOLEAN

)

BEGIN

    INSERT INTO estado_vehiculo(id_vehiculo,id_comando,conectado)

    VALUES(p_id_vehiculo,p_id_comando,p_conectado)

    ON DUPLICATE KEY UPDATE

      id_comando=VALUES(id_comando),

      conectado=VALUES(conectado),

      fecha_actualizacion=CURRENT_TIMESTAMP;

END$$


CREATE PROCEDURE sp_obtener_estado(IN p_id_vehiculo INT)

BEGIN

    SELECT e.id_vehiculo, v.nombre AS vehiculo,

           e.id_comando, c.nombre AS comando, c.codigo,

           e.conectado, e.fecha_actualizacion

      FROM estado_vehiculo e

      JOIN vehiculos v ON v.id_vehiculo=e.id_vehiculo

 LEFT JOIN comandos c ON c.id_comando=e.id_comando

     WHERE e.id_vehiculo=p_id_vehiculo;

END$$


CREATE PROCEDURE sp_registrar_historial(

    IN p_id_vehiculo INT,

    IN p_id_comando INT,

    IN p_origen VARCHAR(30)

)

BEGIN

    INSERT INTO historial_comandos(id_vehiculo,id_comando,origen)

    VALUES(p_id_vehiculo,p_id_comando,p_origen);

END$$


CREATE PROCEDURE sp_obtener_historial(IN p_id_vehiculo INT)

BEGIN

    SELECT h.id_historial, h.id_vehiculo,

           c.nombre AS comando, c.codigo,

           h.fecha_hora, h.origen

      FROM historial_comandos h

 LEFT JOIN comandos c ON c.id_comando=h.id_comando

     WHERE h.id_vehiculo=p_id_vehiculo

     ORDER BY h.fecha_hora DESC, h.id_historial DESC;

END$$


CREATE PROCEDURE sp_crear_demo(

    IN p_id_vehiculo INT,

    IN p_nombre VARCHAR(80),

    IN p_descripcion VARCHAR(255)

)

BEGIN

    INSERT INTO demos(id_vehiculo,nombre,descripcion)

    VALUES(p_id_vehiculo,p_nombre,p_descripcion);

    SELECT LAST_INSERT_ID() AS id_demo;

END$$


CREATE PROCEDURE sp_obtener_demos(IN p_id_vehiculo INT)

BEGIN

    SELECT * FROM demos

     WHERE id_vehiculo=p_id_vehiculo

     ORDER BY id_demo;

END$$


CREATE PROCEDURE sp_actualizar_demo(

    IN p_id_demo INT,

    IN p_nombre VARCHAR(80),

    IN p_descripcion VARCHAR(255),

    IN p_activo BOOLEAN

)

BEGIN

    UPDATE demos

       SET nombre=p_nombre, descripcion=p_descripcion, activo=p_activo

     WHERE id_demo=p_id_demo;

END$$


CREATE PROCEDURE sp_eliminar_demo(IN p_id_demo INT)

BEGIN

    DELETE FROM demos WHERE id_demo=p_id_demo;

END$$


CREATE PROCEDURE sp_agregar_movimiento_demo(

    IN p_id_demo INT,

    IN p_id_comando INT,

    IN p_orden INT,

    IN p_duracion_ms INT,

    IN p_pausa_ms INT

)

BEGIN

    INSERT INTO demo_movimientos

      (id_demo,id_comando,orden,duracion_ms,pausa_ms)

    VALUES

      (p_id_demo,p_id_comando,p_orden,p_duracion_ms,p_pausa_ms);

END$$


CREATE PROCEDURE sp_obtener_movimientos_demo(IN p_id_demo INT)

BEGIN

    SELECT dm.id_demo_movimiento, dm.orden,

           dm.id_comando, c.nombre AS comando, c.codigo,

           dm.duracion_ms, dm.pausa_ms

      FROM demo_movimientos dm

      JOIN comandos c ON c.id_comando=dm.id_comando

     WHERE dm.id_demo=p_id_demo

     ORDER BY dm.orden;

END$$


CREATE PROCEDURE sp_actualizar_movimiento_demo(

    IN p_id_demo_movimiento INT,

    IN p_id_comando INT,

    IN p_orden INT,

    IN p_duracion_ms INT,

    IN p_pausa_ms INT

)

BEGIN

    UPDATE demo_movimientos

       SET id_comando=p_id_comando, orden=p_orden,

           duracion_ms=p_duracion_ms, pausa_ms=p_pausa_ms

     WHERE id_demo_movimiento=p_id_demo_movimiento;

END$$


CREATE PROCEDURE sp_eliminar_movimiento_demo(IN p_id_demo_movimiento INT)

BEGIN

    DELETE FROM demo_movimientos

     WHERE id_demo_movimiento=p_id_demo_movimiento;

END$$

DELIMITER ;

8

Comprende el propósito de los SP

Los SP de vehículos administran la información general; los SP de comandos administran los movimientos posibles; los SP de estado e historial permiten conocer qué está haciendo el vehículo y qué ha hecho; y los SP de demos permiten construir, consultar y modificar la secuencia automática. El uso de CALL facilita probar cada operación antes de escribir una sola línea de la API.

9

Verifica los procedimientos

En MySQL Workbench actualiza el esquema vehiculo_iot y confirma que los Stored Procedures se encuentren disponibles. Todos los alumnos deben conservar exactamente los mismos nombres y parámetros.

4. Poblar la base de datos y probar los SP

10

Puebla la base de datos mediante CALL

Ejecuta los siguientes CALL. El conjunto de datos representa una excavadora de ejemplo. Si tu vehículo es diferente, conserva los mismos SP y adapta únicamente nombre, modelo y comandos. Observa que estado_vehiculo tendrá normalmente un solo registro por vehículo, mientras que comandos, historial_comandos y demo_movimientos contienen múltiples registros.

CALL sp_crear_vehiculo(

  'Excavadora IoT',

  'Modelo X',

  'Vehículo de construcción controlado por ESP8266',

  'ESP8266'

);

CALL sp_crear_comando(1,'AVANZAR',1,'Mover el vehículo hacia adelante');

CALL sp_crear_comando(1,'RETROCEDER',2,'Mover el vehículo hacia atrás');

CALL sp_crear_comando(1,'GIRAR_IZQUIERDA',3,'Giro hacia la izquierda');

CALL sp_crear_comando(1,'GIRAR_DERECHA',4,'Giro hacia la derecha');

CALL sp_crear_comando(1,'SUBIR_BRAZO',5,'Elevar el brazo');

CALL sp_crear_comando(1,'BAJAR_BRAZO',6,'Descender el brazo');

CALL sp_crear_comando(1,'ABRIR_PALA',7,'Abrir la pala');

CALL sp_crear_comando(1,'CERRAR_PALA',8,'Cerrar la pala');

CALL sp_crear_comando(1,'DETENER',9,'Detener cualquier movimiento');

CALL sp_crear_comando(1,'ENCENDER',10,'Encender el vehículo o sistema');

CALL sp_crear_comando(1,'TOGGLE_MUSIC',11,'Alternar reproducción de música');

CALL sp_crear_comando(1,'TOGGLE_LIGHT',12,'Alternar luces del vehículo');

CALL sp_actualizar_estado(1,9,1);

CALL sp_registrar_historial(1,1,'WORKBENCH');

CALL sp_registrar_historial(1,3,'WORKBENCH');

CALL sp_registrar_historial(1,5,'WORKBENCH');

CALL sp_registrar_historial(1,7,'WORKBENCH');

CALL sp_registrar_historial(1,9,'WORKBENCH');

CALL sp_crear_demo(

  1,

  'Demo principal',

  'Secuencia automática de movimientos del vehículo'

);

CALL sp_agregar_movimiento_demo(1,1,1,2000,400);

CALL sp_agregar_movimiento_demo(1,3,2,1000,300);

CALL sp_agregar_movimiento_demo(1,5,3,1500,300);

CALL sp_agregar_movimiento_demo(1,7,4,900,250);

CALL sp_agregar_movimiento_demo(1,8,5,900,250);

CALL sp_agregar_movimiento_demo(1,6,6,1500,300);

CALL sp_agregar_movimiento_demo(1,2,7,2000,400);

CALL sp_agregar_movimiento_demo(1,9,8,500,0);

CALL sp_obtener_vehiculos();

CALL sp_obtener_comandos_vehiculo(1);

CALL sp_obtener_estado(1);

CALL sp_obtener_historial(1);

CALL sp_obtener_demos(1);

CALL sp_obtener_movimientos_demo(1);

11

Consulta y valida los registros

Ejecuta SELECT * FROM vehiculos; SELECT * FROM comandos; SELECT * FROM estado_vehiculo; SELECT * FROM historial_comandos; SELECT * FROM demos; y SELECT * FROM demo_movimientos;. Después compara los resultados con las consultas realizadas mediante los SP. Verifica especialmente que sp_obtener_movimientos_demo(1) regrese la secuencia ordenada del 1 al 8 con comando, código, duración y pausa.

12

Prueba operaciones de actualización

Prueba también operaciones de actualización: modifica temporalmente la descripción de un comando con sp_actualizar_comando, cambia el estado con sp_actualizar_estado y modifica un movimiento con sp_actualizar_movimiento_demo. Después consulta nuevamente los datos. Evita eliminar registros principales hasta haber comprobado las relaciones y el efecto de las llaves foráneas.

13

Comprueba la secuencia de la DEMO

Ejecuta CALL sp_obtener_movimientos_demo(1); y confirma que los movimientos aparezcan ordenados, con su comando, código, duración y pausa correspondientes.

5
