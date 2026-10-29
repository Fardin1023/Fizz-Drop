@echo off
set "DEFAULT_JDK=C:\Users\intern1.it\.vscode\extensions\redhat.java-1.58.0-win32-x64\jre\25.0.4.1-win32-x86_64"
if not defined JAVA_HOME (
    if exist "%DEFAULT_JDK%" (
        set "JAVA_HOME=%DEFAULT_JDK%"
        set "PATH=%DEFAULT_JDK%\bin;%PATH%"
    ) else (
        echo Set JAVA_HOME to a Java 17+ JDK before starting FizzDrop.
        exit /b 1
    )
) else (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)
cd /d "%~dp0backend-spring-boot"
echo Starting FizzDrop Spring Boot Backend...
call mvnw.cmd spring-boot:run
