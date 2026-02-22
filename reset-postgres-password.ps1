# Script para resetear la contrasena de PostgreSQL
# EJECUTAR COMO ADMINISTRADOR

Write-Host "Reseteando contrasena de PostgreSQL..." -ForegroundColor Yellow

# 1. Detener el servicio de PostgreSQL
Write-Host "`n[1] Deteniendo PostgreSQL..." -ForegroundColor Cyan
Stop-Service -Name "postgresql-x64-16" -Force
Start-Sleep -Seconds 2

# 2. Hacer backup del archivo pg_hba.conf
Write-Host "[2] Haciendo backup de pg_hba.conf..." -ForegroundColor Cyan
$pgData = "C:\Program Files\PostgreSQL\16\data"
$pgHbaPath = "$pgData\pg_hba.conf"
$backupPath = "$pgData\pg_hba.conf.backup"

if (Test-Path $pgHbaPath) {
    Copy-Item $pgHbaPath $backupPath -Force
    Write-Host "[OK] Backup creado: $backupPath" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se encontro pg_hba.conf en: $pgHbaPath" -ForegroundColor Red
    exit 1
}

# 3. Modificar pg_hba.conf para permitir acceso sin contrasena temporalmente
Write-Host "[3] Modificando pg_hba.conf para acceso sin contrasena..." -ForegroundColor Cyan
$content = Get-Content $pgHbaPath
$newContent = @()
foreach ($line in $content) {
    if ($line -match "^host.*all.*all.*127.0.0.1/32.*scram-sha-256") {
        $newContent += "host    all             all             127.0.0.1/32            trust"
    } elseif ($line -match "^host.*all.*all.*::1/128.*scram-sha-256") {
        $newContent += "host    all             all             ::1/128                 trust"
    } else {
        $newContent += $line
    }
}
$newContent | Set-Content $pgHbaPath -Force
Write-Host "[OK] pg_hba.conf modificado" -ForegroundColor Green

# 4. Iniciar el servicio
Write-Host "[4] Iniciando PostgreSQL..." -ForegroundColor Cyan
Start-Service -Name "postgresql-x64-16"
Start-Sleep -Seconds 3

# 5. Cambiar la contrasena
Write-Host "[5] Cambiando contrasena a User123!..." -ForegroundColor Cyan
$env:Path += ";C:\Program Files\PostgreSQL\16\bin"
$alterCmd = "ALTER USER postgres WITH PASSWORD 'User123!';"
$result = & psql -U postgres -c $alterCmd 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Contrasena cambiada exitosamente!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Error al cambiar la contrasena: $result" -ForegroundColor Red
}

# 6. Restaurar pg_hba.conf
Write-Host "[6] Restaurando pg_hba.conf..." -ForegroundColor Cyan
Copy-Item $backupPath $pgHbaPath -Force
Write-Host "[OK] pg_hba.conf restaurado" -ForegroundColor Green

# 7. Reiniciar el servicio
Write-Host "[7] Reiniciando PostgreSQL..." -ForegroundColor Cyan
Restart-Service -Name "postgresql-x64-16" -Force
Start-Sleep -Seconds 3

# 8. Crear la base de datos
Write-Host "[8] Creando base de datos apuntes_premium..." -ForegroundColor Cyan
$env:PGPASSWORD = "User123!"
$createCmd = "CREATE DATABASE apuntes_premium;"
$result = & psql -U postgres -c $createCmd 2>&1

$resultString = $result | Out-String
if ($resultString -match "CREATE DATABASE" -or $resultString -match "already exists") {
    Write-Host "[OK] Base de datos creada!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Error o base de datos ya existe: $result" -ForegroundColor Yellow
}

Write-Host "`nProceso completado!" -ForegroundColor Green
Write-Host "`nCredenciales de PostgreSQL:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host "   Usuario: postgres" -ForegroundColor White
Write-Host "   Password: User123!" -ForegroundColor White
Write-Host "   Database: apuntes_premium" -ForegroundColor White

Write-Host "`nAhora puedes ejecutar:" -ForegroundColor Yellow
Write-Host "   cd apps\api" -ForegroundColor White
Write-Host "   npm run seed" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
