FROM python:3.11-slim
WORKDIR /app

# Install deps first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# Install watchfiles for reload support
RUN pip install --no-cache-dir watchfiles
COPY . .

EXPOSE 8004
CMD ["uvicorn[standard]","app.main:app","--host","0.0.0.0","--port","8004","--reload"]


