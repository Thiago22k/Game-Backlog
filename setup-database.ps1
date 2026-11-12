param(
    [Parameter(Mandatory=$false)]
    [string]$Password
)

if (-not $Password) {
    $Password = Read-Host "Por favor ingresa la contraseña del superusuario 'postgres' de PostgreSQL" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$env:PGPASSWORD = $Password
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
    $psql = "psql"
}

Write-Host "Verificando conexión a PostgreSQL..." -ForegroundColor Cyan
$testConn = & $psql -U postgres -h 127.0.0.1 -p 5432 -c "SELECT 1;" 2>&1 | Out-String

if ($testConn -notmatch "1 row|1 fila|---\s*1") {
    Write-Host "❌ Error de conexión: Contraseña incorrecta o PostgreSQL no responde." -ForegroundColor Red
    Write-Host $testConn
    exit 1
}

Write-Host "✅ Conexión exitosa a PostgreSQL." -ForegroundColor Green

# Crear la base de datos game_backlog si no existe
Write-Host "Verificando base de datos 'game_backlog'..." -ForegroundColor Cyan
$checkDb = & $psql -U postgres -h 127.0.0.1 -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='game_backlog';" 2>&1 | Out-String

if ($checkDb.Trim() -ne "1") {
    Write-Host "Creando base de datos 'game_backlog'..." -ForegroundColor Yellow
    & $psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE game_backlog;"
} else {
    Write-Host "La base de datos 'game_backlog' ya existe." -ForegroundColor Yellow
}

# Ejecutar el esquema
$schemaPath = Join-Path $PSScriptRoot "game-backlog-backend\database-schema.sql"
Write-Host "Aplicando esquema desde $schemaPath..." -ForegroundColor Cyan
& $psql -U postgres -h 127.0.0.1 -p 5432 -d game_backlog -f $schemaPath

Write-Host "Actualizando DB_PASSWORD en game-backlog-backend\.env..." -ForegroundColor Cyan
$envPath = Join-Path $PSScriptRoot "game-backlog-backend\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath
    $escaped = $Password.Replace('$', '$$')
    $newContent = $content -replace '^DB_PASSWORD=.*$', "DB_PASSWORD=$escaped"
    Set-Content -Path $envPath -Value $newContent
    Write-Host "✅ DB_PASSWORD actualizado en .env" -ForegroundColor Green
}

# Contar tablas creadas
$tablesCount = & $psql -U postgres -h 127.0.0.1 -p 5432 -d game_backlog -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1 | Out-String
Write-Host "🎉 Tablas creadas en game_backlog: $($tablesCount.Trim())" -ForegroundColor Green

