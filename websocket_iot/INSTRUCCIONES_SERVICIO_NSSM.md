# Instrucciones para Servicio Permanente con NSSM en Windows Server

Copia y pega este bloque completo en tu ventana de **PowerShell (como Administrador)** dentro de la máquina Windows Server de EC2:

```powershell
Set-Location "C:\Users\Administrator\Documents\websocket_iot"

# 1. Descargar e instalar NSSM en System32
if (-not (Test-Path "C:\Windows\System32\nssm.exe")) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile "$env:TEMP\nssm.zip" -UseBasicParsing
    Expand-Archive -Path "$env:TEMP\nssm.zip" -DestinationPath "$env:TEMP\nssm" -Force
    Copy-Item "$env:TEMP\nssm\nssm-2.24\win64\nssm.exe" "C:\Windows\System32\nssm.exe" -Force
}

# 2. Registrar el servicio persistente IoTServer
nssm stop IoTServer 2>$null
nssm remove IoTServer confirm 2>$null
nssm install IoTServer "C:\Users\Administrator\Documents\websocket_iot\.venv\Scripts\python.exe" "-m uvicorn app.main:app --host 0.0.0.0 --port 443 --ssl-keyfile key.pem --ssl-certfile cert.pem"
nssm set IoTServer AppDirectory "C:\Users\Administrator\Documents\websocket_iot"
nssm set IoTServer DisplayName "IoT FastAPI Backend Server"
nssm set IoTServer Description "Servidor FastAPI WSS y HTTPS para excavadora IoT"
nssm set IoTServer Start SERVICE_AUTO_START

# 3. Arrancar el servicio
nssm start IoTServer

# 4. Verificar estado
Start-Sleep -Seconds 3
nssm status IoTServer
```

### Comandos útiles de NSSM:
* Ver estado: `nssm status IoTServer`
* Reiniciar servicio: `nssm restart IoTServer`
* Detener servicio: `nssm stop IoTServer`
