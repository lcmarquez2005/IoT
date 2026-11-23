# Instrucciones para Actualizar el Servidor EC2 mediante Archivo ZIP
**Práctica 4.3 - Plataforma Comercial Multiusuario IoT**

El archivo ZIP actualizado con todo el código de la Práctica 4.3 (FastAPI, RBAC, JWT, nuevos routers y dependencias) ha sido generado y se encuentra en:
* **Ruta local:** `websocket_iot/app.zip` (40 KB)
* **Descarga directa:** `https://github.com/lcmarquez2005/IoT/raw/main/websocket_iot/app.zip`

---

## Método A: Descarga y Actualización Automática (Recomendado)
Abre **PowerShell** en tu servidor EC2 Windows Server y pega este bloque de comandos completo:

```powershell
Set-Location "C:\Users\Administrator\Documents"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri "https://github.com/lcmarquez2005/IoT/raw/main/websocket_iot/app.zip" -OutFile "app.zip" -UseBasicParsing
Expand-Archive -Path "app.zip" -DestinationPath "websocket_iot" -Force
& "C:\Users\Administrator\Documents\websocket_iot\.venv\Scripts\pip.exe" install -r "C:\Users\Administrator\Documents\websocket_iot\requirements.txt"
nssm restart IoTServer
Start-Sleep -Seconds 2
Get-Service IoTServer
```

---

## Método B: Copiar y Pegar el Archivo ZIP por RDP
1. En tu máquina local, copia el archivo:
   `websocket_iot/app.zip`
2. En la sesión de Escritorio Remoto (RDP), pégalo en:
   `C:\Users\Administrator\Documents`
3. En **PowerShell** del servidor EC2, ejecuta:

```powershell
Set-Location "C:\Users\Administrator\Documents"
Expand-Archive -Path "app.zip" -DestinationPath "websocket_iot" -Force
& "C:\Users\Administrator\Documents\websocket_iot\.venv\Scripts\pip.exe" install -r "C:\Users\Administrator\Documents\websocket_iot\requirements.txt"
nssm restart IoTServer
Start-Sleep -Seconds 2
Get-Service IoTServer
```

---

## Verificación Final
Abre en el navegador del servidor o en tu computadora:
* **Swagger Docs:** `https://54.82.137.170/docs`
* Deberás ver los nuevos grupos: **Autenticación y Clientes**, **Catálogo de Modelos**, **Unidades Físicas e Inventario**, **Prueba Comercial de Invitado**, **Editor de Demos** y **Bitácora de Auditoría**.
