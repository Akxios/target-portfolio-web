@echo off
chcp 65001 > nul
echo [i] Принудительная остановка Target Portfolio...
docker-compose down
echo ✅ Программа полностью остановлена!
pause
