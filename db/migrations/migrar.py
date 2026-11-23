#!/usr/bin/env python3
"""
Ejecutor de Migraciones Versionadas para Amazon RDS MySQL.
Práctica 4.3 - Plataforma Comercial Multiusuario IoT.
Uso:
    python db/migrations/migrar.py status
    python db/migrations/migrar.py up
    python db/migrations/migrar.py verify
"""

import os
import sys
import glob
import subprocess
import pymysql
from dotenv import load_dotenv

# Cargar variables de entorno desde websocket_iot/.env o entorno
dotenv_path = os.path.join(os.path.dirname(__file__), "..", "..", "websocket_iot", ".env")
load_dotenv(dotenv_path)

DB_HOST = os.getenv("DB_HOST", "database-1.cidzofm0szn8.us-east-1.rds.amazonaws.com")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "vehiculo_iot")
DB_NAME = os.getenv("DB_NAME", "vehiculo_iot")

def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor
    )

def init_migrations_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(50) PRIMARY KEY,
            descripcion VARCHAR(255) NOT NULL,
            aplicado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            exitoso BOOLEAN NOT NULL DEFAULT TRUE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

def get_applied_migrations(cursor):
    init_migrations_table(cursor)
    cursor.execute("SELECT version, aplicado_en FROM schema_migrations WHERE exitoso = TRUE ORDER BY version")
    return {row["version"]: row["aplicado_en"] for row in cursor.fetchall()}

def execute_sql_file_via_cli(file_path):
    cmd = [
        "mariadb",
        "--ssl-verify-server-cert=0",
        f"-h{DB_HOST}",
        f"-P{DB_PORT}",
        f"-u{DB_USER}",
        f"-p{DB_PASSWORD}",
        DB_NAME
    ]
    with open(file_path, "r", encoding="utf-8") as f:
        res = subprocess.run(cmd, stdin=f, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Error ejecutando {file_path}: {res.stderr}")
    return res.stdout

def run_up():
    print(f"[*] Conectando a Amazon RDS: {DB_HOST}/{DB_NAME}...")
    conn = get_connection()
    migrations_dir = os.path.dirname(__file__)
    migration_files = sorted(glob.glob(os.path.join(migrations_dir, "V4.3__*.sql")))

    with conn.cursor() as cursor:
        applied = get_applied_migrations(cursor)
        print(f"[*] Migraciones ya aplicadas: {len(applied)}")
        
        for file_path in migration_files:
            file_name = os.path.basename(file_path)
            version = file_name.split("__")[0]
            description = file_name.replace(".sql", "")
            
            if version in applied:
                print(f"  [✓] {file_name} ya aplicada en {applied[version]}")
                continue
            
            print(f"  [->] Aplicando: {file_name}...")
            try:
                execute_sql_file_via_cli(file_path)
                cursor.execute(
                    "INSERT INTO schema_migrations (version, descripcion, exitoso) VALUES (%s, %s, TRUE) "
                    "ON DUPLICATE KEY UPDATE exitoso=TRUE, aplicado_en=CURRENT_TIMESTAMP",
                    (version, description)
                )
                print(f"  [SUCCESS] {file_name} aplicada correctamente.")
            except Exception as e:
                print(f"  [ERROR] Falló {file_name}: {e}")
                sys.exit(1)

    conn.close()
    print("\n[✓] Todas las migraciones fueron ejecutadas con éxito.")
    run_verify()

def run_verify():
    print("\n[*] Verificando integridad del esquema en Amazon RDS:")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tables = [list(row.values())[0] for row in cursor.fetchall()]
        print(f"  Total de tablas ({len(tables)}): {', '.join(tables)}")
        
        # Verificar conteos
        for t in ["roles", "usuarios", "modelos_vehiculo", "vehiculos", "comandos", "estado_vehiculo", "historial_comandos", "demos", "demo_movimientos", "sesiones_invitado", "auditoria_sistema"]:
            if t in tables:
                cursor.execute(f"SELECT COUNT(*) AS c FROM {t}")
                cnt = cursor.fetchone()["c"]
                print(f"  • {t.ljust(22)}: {cnt} registros")
            else:
                print(f"  [ALERTA] Tabla no encontrada: {t}")
        
        # Verificar que vehículo 1 tenga modelo y número de serie
        cursor.execute("SELECT id_vehiculo, nombre, id_modelo, estado_comercial, numero_serie FROM vehiculos WHERE id_vehiculo = 1")
        v1 = cursor.fetchone()
        print(f"\n  Vehículo 1 configurado: {v1}")

        # Verificar usuarios y roles
        cursor.execute("SELECT u.id_usuario, u.nombre, u.email, r.nombre AS rol FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol")
        usuarios = cursor.fetchall()
        print(f"  Usuarios registrados ({len(usuarios)}):")
        for u in usuarios:
            print(f"    - [{u['rol']}] {u['nombre']} ({u['email']})")

    conn.close()
    print("\n[✓] Verificación de esquema completada exitosamente.")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "up"
    if action == "up":
        run_up()
    elif action == "verify":
        run_verify()
    elif action == "status":
        conn = get_connection()
        with conn.cursor() as cursor:
            applied = get_applied_migrations(cursor)
            print("Migraciones aplicadas:")
            for v, dt in applied.items():
                print(f"  - {v}: {dt}")
        conn.close()
    else:
        print("Comandos disponibles: up, verify, status")
