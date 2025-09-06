FROM python:3.11-slim
WORKDIR /app

# Install deps first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Install watchfiles for reload support
RUN pip install --no-cache-dir watchfiles

# Copy source code (will be overridden by volume in dev)
COPY . .
# Expose API port
EXPOSE 8001

# Default command (can be overridden in docker-compose)
CMD ["uvicorn[standard]","app.main:app","--host","0.0.0.0","--port","8001","--reload"]