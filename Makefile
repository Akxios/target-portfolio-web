.PHONY: start stop logs restart reset

start:
	@if [ ! -f .env ]; then cp .env.example .env && echo "📝 Создан .env из примера"; fi
	@echo "🚀 Запуск проекта..."
	docker compose up -d --build
	@echo "✅ Проект доступен на http://localhost:8000"
	@echo "✅ Документация доступна на http://localhost:8000/docs"

stop:
	@echo "🛑 Остановка проекта..."
	docker compose down

logs:
	docker compose logs -f

restart: stop start

reset:
	@echo "⚠️  ВНИМАНИЕ: Полное удаление базы данных и пересборка проекта!"
	docker compose down -v --remove-orphans
	@echo "🚀 Перезапуск..."
	docker compose up -d --build
	@echo "✅ Проект сброшен и запущен заново."
