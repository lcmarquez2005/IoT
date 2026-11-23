# Script para actualizar el servidor Windows Server desde el archivo ZIP
Set-Location "C:\Users\Administrator\Documents"

Write-Host "[1/3] Extrayendo archivos actualizados..." -ForegroundColor Cyan
if (Test-Path "websocket_iot_update_4_3.zip") {
    Expand-Archive -Path "websocket_iot_update_4_3.zip" -DestinationPath "websocket_iot" -Force
} elseif (Test-Path "app.zip") {
    Expand-Archive -Path "app.zip" -DestinationPath "websocket_iot" -Force
} else {
    Write-Host "Asegurate de haber copiado websocket_iot_update_4_3.zip o app.zip a Documents." -ForegroundColor Yellow
}

Write-Host "`n[2/3] Instalando dependencias de Práctica 4.3 (pyjwt, bcrypt)..." -ForegroundColor Cyan
& "C:\Users\Administrator\Documents\websocket_iot\.venv\Scripts\pip.exe" install -r "C:\Users\Administrator\Documents\websocket_iot\requirements.txt"

Write-Host "`n[3/3] Reiniciando servicio permanente IoTServer (NSSM)..." -ForegroundColor Cyan
nssm restart IoTServer

Start-Sleep -Seconds 2
Get-Service IoTServer
Write-Host "`n[OK] Servidor actualizado con exito. Verifica en https://localhost/docs o https://54.82.137.170/docs" -ForegroundColor Green
