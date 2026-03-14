@echo off
chcp 65001 > nul

:start_app
cls
echo ======================================================
echo 🚀 Запуск Target Portfolio...
echo ======================================================

if not exist .env (
    copy .env.example .env
    echo [i] Создан базовый файл настроек .env
)

echo [i] Поднимаем базу данных и приложение (подождите)...
docker-compose up -d --build

:menu
cls
echo ======================================================
echo ✅ ПРОГРАММА УСПЕШНО ЗАПУЩЕНА!
echo 🌐 Откройте сайт в браузере: http://localhost:8000
echo 🌐 Документация доступна на: http://localhost:8000/docs
echo ======================================================
echo.
echo ВЫБЕРИТЕ ДЕЙСТВИЕ:
echo [1] - Смотреть логи работы (для возврата нажмите Ctrl+C)
echo [2] - Полный сброс (удалить базу данных и перезапустить)
echo [3] - Выключить программу и выйти
echo.

choice /C 123 /N /M "Ваш выбор (1, 2 или 3): "

:: В Batch-файлах проверка errorlevel идет сверху вниз от большего к меньшему
if errorlevel 3 goto stop
if errorlevel 2 goto reset
if errorlevel 1 goto logs

:logs
echo.
echo [i] Включен просмотр логов...
echo [!] Чтобы вернуться в главное меню, нажмите Ctrl+C
echo ------------------------------------------------------
docker-compose logs -f
echo.
:: Если логи прерваны через Ctrl+C, возвращаемся в меню
goto menu

:reset
echo.
echo ======================================================
echo ⚠️  ОПАСНОСТЬ: ВЫ УВЕРЕНЫ?
echo Это действие безвозвратно удалит все данные портфеля!
echo ======================================================
choice /C YN /N /M "Нажмите Y для подтверждения или N для отмены: "
if errorlevel 2 goto menu
if errorlevel 1 (
    echo.
    echo [i] Удаление данных и остановка контейнеров...
    docker-compose down -v --remove-orphans
    echo [i] Данные очищены. Запускаем проект заново...
    timeout /t 2 > nul
    goto start_app
)

:stop
echo.
echo [i] Остановка всех сервисов...
docker-compose down
echo.
echo ✅ Программа полностью выключена.
pause
exit
