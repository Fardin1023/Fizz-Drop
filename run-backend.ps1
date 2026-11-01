$defaultJdk = "C:\Users\intern1.it\.vscode\extensions\redhat.java-1.58.0-win32-x64\jre\25.0.4.1-win32-x86_64"
if (-not $env:JAVA_HOME) {
    if (Test-Path $defaultJdk) {
        $env:JAVA_HOME = $defaultJdk
        $env:Path = "$defaultJdk\bin;" + $env:Path
        Write-Host "Auto-configured JAVA_HOME: $env:JAVA_HOME" -ForegroundColor DarkCyan
    } else {
        throw "Set JAVA_HOME to a Java 17+ JDK before starting FizzDrop."
    }
} else {
    $env:Path = "$env:JAVA_HOME\bin;" + $env:Path
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
