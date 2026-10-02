FROM python:3.12.10-slim
WORKDIR /app
COPY backend/ai-service/requirements.lock.txt ./
RUN pip install --no-cache-dir -r requirements.lock.txt
COPY backend/ai-service/ ./
COPY docs/contracts/endpoint-status.json /app/contracts/endpoint-status.json
RUN useradd -m app
USER app
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","3104","--proxy-headers","--forwarded-allow-ips","*"]
