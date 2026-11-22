# ==============================================================================
# Script para Instalar y Configurar NSSM como Servicio de Windows (Permanente)
# ==============================================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " INSTALANDO SERVICIO PERMANENTE DE WINDOWS (NSSM)          " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Asegurar ruta de trabajo
Set-Location "C:\Users\Administrator\Documents\websocket_iot"

# 2. Descargar NSSM oficial si no existe en System32
if (-not (Test-Path "C:\Windows\System32\nssm.exe")) {
    Write-Host "`n[1/4] Descargando binario oficial de NSSM 2.24..." -ForegroundColor Yellow
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$env:TEMP\nssm.zip" -UseBasicParsing
    Expand-Archive -Path "$env:TEMP\nssm.zip" -DestinationPath "$env:TEMP\nssm" -Force
    Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" "C:\Windows\System32\nssm.exe" -Force
    Write-Host "  -> NSSM instalado correctamente en C:\Windows\System32\nssm.exe" -ForegroundColor Green
} else {
    Write-Host "`n[1/4] NSSM ya esta instalado en el sistema." -ForegroundColor Gray
}

# 3. Detener y remover servicio previo si existiera
Write-Host "`n[2/4] Limpiando registros anteriores de IoTServer..." -ForegroundColor Yellow
nssm stop IoTServer 2>$null
nssm remove IoTServer confirm 2>$null

# 4. Registrar el nuevo servicio IoTServer
$pythonPath = "C:\Users\Administrator\Documents\websocket_iot\.venv\Scripts\python.exe"
$appArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 443 --ssl-keyfile key.pem --ssl-certfile cert.pem"
$appDir = "C:\Users\Administrator\Documents\websocket_iot"

Write-Host "`n[3/4] Creando servicio IoTServer con arranque automatico..." -ForegroundColor Yellow
nssm install IoTServer "$pythonPath" "$appArgs"
nssm set IoTServer AppDirectory "$appDir"
nssm set IoTServer DisplayName "IoT FastAPI Backend Server"
nssm set IoTServer Description "Servidor FastAPI WSS y HTTPS para excavadora IoT"
nssm set IoTServer Start SERVICE_AUTO_START

# 5. Iniciar servicio
Write-Host "`n[4/4] Iniciando servicio..." -ForegroundColor Yellow
nssm start IoTServer

# 6. Comprobar estado
Start-Sleep -Seconds 3
$status = nssm status IoTServer

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " ESTADO FINAL DEL SERVICIO: $status                         " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

if ($status -eq "SERVICE_RUNNING") {
    Write-Host "¡Servidor activo en segundo plano! Ahora puedes cerrar RDP sin problemas." -ForegroundColor Green
} else {
    Write-Host "Aviso: El estado es '$status'. Verifica que existan cert.pem y key.pem en la carpeta." -ForegroundColor Yellow
}
