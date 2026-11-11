if (-not $env:JAVA_HOME) {
    throw "Set JAVA_HOME to a JDK 25 or newer before starting FizzDrop."
}

$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
$javaCommand = Get-Command "$env:JAVA_HOME\bin\java.exe" -ErrorAction Stop
$javaVersionOutput = (& $javaCommand.Source -version 2>&1 | Out-String)
if ($javaVersionOutput -notmatch 'version\s+"?(\d+)') {
    throw "Unable to determine the Java version from JAVA_HOME. Configure a JDK 25 or newer."
}
if ([int]$matches[1] -lt 25) {
    throw "FizzDrop requires JDK 25 or newer. Configure JAVA_HOME to use a supported JDK."
}

# Auto-load .env file if present
$envFile = "$PSScriptRoot\.env"
if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile..." -ForegroundColor DarkCyan
    Get-Content $envFile | Where-Object { $_ -match '^\s*([^#=]+)\s*=\s*(.*)\s*$' } | ForEach-Object {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
    }
}

Set-Location "$PSScriptRoot\backend-spring-boot"
Write-Host "Starting FizzDrop Spring Boot Backend..." -ForegroundColor Cyan
.\mvnw.cmd spring-boot:run
