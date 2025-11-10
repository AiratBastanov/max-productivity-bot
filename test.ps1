Write-Host "=== Тест MAX бота ===" -ForegroundColor Green

Write-Host "1. Проверка здоровья:" -ForegroundColor Yellow
curl http://localhost:3000/health
Write-Host ""

Write-Host "2. Тест команды 'start':" -ForegroundColor Yellow
$body1 = @{
    message = @{text = "start"}
    user = @{id = 12345}
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/webhook" -Method Post -Body $body1 -ContentType "application/json"
Write-Host ""

Write-Host "3. Тест команды 'задачи':" -ForegroundColor Yellow
$body2 = @{
    message = @{text = "задачи"}
    user = @{id = 12345}
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/webhook" -Method Post -Body $body2 -ContentType "application/json"
Write-Host ""