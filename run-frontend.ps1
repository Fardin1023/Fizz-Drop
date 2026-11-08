Set-Location "$PSScriptRoot\fizzdrop-client"
Write-Host "Starting FizzDrop Vite Client..." -ForegroundColor Cyan
& "E:\Web Development Softwares\Node\npm.cmd" run dev -- --host 0.0.0.0 --port 5173
