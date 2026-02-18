FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Переменные окружения для uv
# UV_COMPILE_BYTECODE=1 — компилирует .pyc файлы для ускорения старта
# UV_LINK_MODE=copy — копирует файлы вместо жестких ссылок
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Сначала копируем только файлы зависимостей (для кэширования слоев)
COPY pyproject.toml uv.lock ./

# Устанавливаем зависимости (без самого проекта)
# --frozen: строго следовать uv.lock
# --no-install-project: не устанавливать пока сам код приложения
RUN uv sync --frozen --no-install-project

# Копируем весь исходный код
COPY . .

# Доустанавливаем сам проект (если нужно) и синхронизируем окружение
RUN uv sync --frozen

# Указываем команду запуска
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
