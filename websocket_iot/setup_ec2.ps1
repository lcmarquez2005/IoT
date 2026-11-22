# ==============================================================================
# Script de Configuración Automatizada del Backend IoT en Windows Server (EC2)
# ==============================================================================
param(
    [string]$RdsHost = "database-1.cidzofm0szn8.us-east-1.rds.amazonaws.com"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " INICIANDO DESPLIEGUE AUTOMATICO DEL SERVIDOR IOT EN EC2    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Configurar Reglas de Firewall en Windows
Write-Host "`n[1/6] Configurando reglas en Windows Defender Firewall..." -ForegroundColor Yellow
$firewallRules = @(
    @{Name="HTTPS Port 443"; Port=443},
    @{Name="HTTP Port 80"; Port=80},
    @{Name="Custom Port 8000"; Port=8000}
)
foreach ($rule in $firewallRules) {
    if (-not (Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -LocalPort $rule.Port -Protocol TCP -Action Allow | Out-Null
        Write-Host "  -> Regla creada: $($rule.Name)" -ForegroundColor Green
    } else {
        Write-Host "  -> Regla ya existia: $($rule.Name)" -ForegroundColor Gray
    }
}

# 2. Verificar o Descargar e Instalar Python Real Oficial
Write-Host "`n[2/6] Verificando instalacion real de Python..." -ForegroundColor Yellow

function Get-RealPython {
    $candidates = @(
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python310\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            return $c
        }
    }
    # Probar comando en PATH descartando el stub de WindowsApps
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd -and ($cmd.Source -notlike "*WindowsApps*")) {
        return $cmd.Source
    }
    return $null
}

$realPython = Get-RealPython

if (-not $realPython) {
    Write-Host "  -> Python no esta instalado. Descargando instalador oficial de Python 3.11.9..." -ForegroundColor Yellow
    $installerUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    $installerPath = "$env:TEMP\python-3.11.9-amd64.exe"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
    
    Write-Host "  -> Instalando Python 3.11 en modo silencioso (agregando a PATH)..." -ForegroundColor Yellow
    $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_test=0" -Wait -PassThru
    
    # Actualizar PATH en la sesion actual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";C:\Program Files\Python311;C:\Program Files\Python311\Scripts"
    
    $realPython = Get-RealPython
}

if (-not $realPython) {
    Write-Error "No se pudo completar la instalacion de Python. Por favor ejecuta el instalador descargado en $env:TEMP\python-3.11.9-amd64.exe"
    exit 1
}

Write-Host "  -> Python real verificado en: $realPython" -ForegroundColor Green
& $realPython --version

# 3. Directorio de trabajo y Entorno Virtual
$workDir = $PSScriptRoot
Set-Location $workDir
Write-Host "`n[3/6] Configurando entorno virtual (.venv) en $workDir..." -ForegroundColor Yellow

$venvDir = "$workDir\.venv"
$venvPython = "$venvDir\Scripts\python.exe"
$venvPip = "$venvDir\Scripts\pip.exe"

# Si existe un .venv corrupto sin pip/python, eliminarlo para recrear limpio
if ((Test-Path $venvDir) -and (-not (Test-Path $venvPython))) {
    Write-Host "  -> Detectado .venv incompleto. Limpiando..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $venvDir -ErrorAction SilentlyContinue
}

if (-not (Test-Path $venvDir)) {
    Write-Host "  -> Creando nuevo .venv con $realPython..." -ForegroundColor Yellow
    & $realPython -m venv "$venvDir"
}

if (-not (Test-Path $venvPython)) {
    Write-Error "Error critico al crear el entorno virtual en $venvDir"
    exit 1
}

Write-Host "  -> Instalando / actualizando librerias desde requirements.txt..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip --quiet
& $venvPython -m pip install -r "$workDir\requirements.txt" --quiet
Write-Host "  -> Entorno virtual y dependencias instaladas correctamente." -ForegroundColor Green

# 4. Configurar archivo .env
Write-Host "`n[4/6] Configurando credenciales de base de datos (.env)..." -ForegroundColor Yellow
if ([string]::IsNullOrWhiteSpace($RdsHost)) {
    $RdsHost = Read-Host "Ingresa el Endpoint de la RDS (presiona Enter para usar database-1.cidzofm0szn8.us-east-1.rds.amazonaws.com)"
    if ([string]::IsNullOrWhiteSpace($RdsHost)) {
        $RdsHost = "database-1.cidzofm0szn8.us-east-1.rds.amazonaws.com"
    }
}

$envContent = @"
DB_HOST=$($RdsHost.Trim())
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=vehiculo_iot
DB_NAME=vehiculo_iot
"@
Set-Content -Path "$workDir\.env" -Value $envContent -Force
Write-Host "  -> Archivo .env guardado con host: $RdsHost" -ForegroundColor Green

# Probar conexion a RDS
Write-Host "  -> Probando conexion a Amazon RDS desde Python..." -ForegroundColor Yellow
& $venvPython -c "from app.database.connection import db_manager; print('     Conexion RDS:', db_manager.test_connection())"

# 5. Obtener IP Publica de AWS y Generar Certificados SSL
Write-Host "`n[5/6] Generando certificados SSL autofirmados para HTTPS y WSS..." -ForegroundColor Yellow
$publicIp = "127.0.0.1"
try {
    $token = Invoke-RestMethod -Headers @{"X-aws-ec2-metadata-token-ttl-seconds" = "21600"} -Method PUT -Uri "http://169.254.169.254/latest/api/token" -TimeoutSec 3 -ErrorAction Stop
    $publicIp = Invoke-RestMethod -Headers @{"X-aws-ec2-metadata-token" = $token} -Method GET -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 3 -ErrorAction Stop
} catch {
    try {
        $publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 3).Trim()
    } catch {
        $publicIp = "127.0.0.1"
    }
}
Write-Host "  -> IP publica detectada para el certificado: $publicIp" -ForegroundColor Cyan

& $venvPython -c @"
import datetime
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
with open('key.pem', 'wb') as f:
    f.write(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ))

subject = issuer = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, '$publicIp')
])
cert = x509.CertificateBuilder().subject_name(
    subject
).issuer_name(
    issuer
).public_key(
    key.public_key()
).serial_number(
    x509.random_serial_number()
).not_valid_before(
    datetime.datetime.now(datetime.timezone.utc)
).not_valid_after(
    datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
).sign(key, hashes.SHA256())

with open('cert.pem', 'wb') as f:
    f.write(cert.public_bytes(serialization.Encoding.PEM))
print('     Certificados SSL (key.pem y cert.pem) generados con exito.')
"@

# 6. Registrar Servicio Persistente en Windows Task Scheduler
Write-Host "`n[6/6] Configurando servicio automatico en segundo plano..." -ForegroundColor Yellow
$taskName = "IoT-Backend-Server"
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$actionArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 443 --ssl-keyfile key.pem --ssl-certfile cert.pem"
$action = New-ScheduledTaskAction -Execute $venvPython -Argument $actionArgs -WorkingDirectory $workDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

Start-Sleep -Seconds 3
$taskStatus = (Get-ScheduledTask -TaskName $taskName).State
Write-Host "  -> Tarea programada '$taskName' iniciada. Estado: $taskStatus" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " DESPLIEGUE FINALIZADO EXITOSAMENTE                         " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "URLs publicas de tu servidor:" -ForegroundColor White
Write-Host "  Swagger UI HTTPS: https://$publicIp/docs" -ForegroundColor Cyan
Write-Host "  Health Check:     https://$publicIp/status" -ForegroundColor Cyan
Write-Host "  WebSocket WSS:    wss://$publicIp/ws/1" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green
