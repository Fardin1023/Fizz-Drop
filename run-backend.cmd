@echo off
if not defined JAVA_HOME (
    echo Set JAVA_HOME to a JDK 25 or newer before starting FizzDrop.
    exit /b 1
)
set "PATH=%JAVA_HOME%\bin;%PATH%"

set "JAVA_VERSION="
set "JAVA_MAJOR="
for /f "tokens=3" %%V in ('"%JAVA_HOME%\bin\java.exe" -version 2^>^&1 ^| findstr /I /C:"version"') do set "JAVA_VERSION=%%V"
set "JAVA_MAJOR=%JAVA_VERSION:"=%"
for /f "tokens=1 delims=." %%V in ("%JAVA_MAJOR%") do set "JAVA_MAJOR=%%V"
if not defined JAVA_MAJOR (
    echo Unable to determine the Java version from JAVA_HOME. Configure a JDK 25 or newer.
    exit /b 1
)
if %JAVA_MAJOR% LSS 25 (
    echo FizzDrop requires JDK 25 or newer. Configure JAVA_HOME to use a supported JDK.
    exit /b 1
)

cd /d "%~dp0backend-spring-boot"
echo Starting FizzDrop Spring Boot Backend...
call mvnw.cmd spring-boot:run
