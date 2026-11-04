# Single image: builds the PWA, then serves it + the API from FastAPI/uvicorn.
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx vite build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production DEBUG=false
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY data/processed /app/data/processed
COPY --from=web /app/frontend/dist /app/frontend/dist
ENV INDIA_DATA_DIR=/app/data/processed/india FRONTEND_DIST=/app/frontend/dist
RUN useradd -m locate && chown -R locate /app
USER locate
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
