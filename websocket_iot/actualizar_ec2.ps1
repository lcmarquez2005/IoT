# Actualizar código y reiniciar servicio en Windows Server EC2
Set-Location C:\IoT
Write-Host "[*] Descargando últimos cambios desde GitHub..." -ForegroundColor Cyan
git pull origin main

Write-Host "[*] Instalando dependencias nuevas (pyjwt, bcrypt)..." -ForegroundColor Cyan
C:\IoT\websocket_iot\.venv\Scripts\pip.exe install -r C:\IoT\websocket_iot\requirements.txt

Write-Host "[*] Reiniciando servicio IoTServer (NSSM)..." -ForegroundColor Cyan
nssm restart IoTServer

Start-Sleep -Seconds 3
Get-Service IoTServer
Write-Host "[✓] Servicio IoTServer actualizado y en ejecución." -ForegroundColor Green
