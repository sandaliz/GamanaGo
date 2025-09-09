FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .

# Install compiler for fastText
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Copy fastText model into container
COPY app/services/lid.176.bin ./app/services/

EXPOSE 8006
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006", "--reload"]