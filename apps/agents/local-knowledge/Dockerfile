FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# optional: uvicorn --reload uses watchfiles automatically if present
RUN pip install --no-cache-dir watchfiles

# make sure this COPY brings in your "app/" folder with main.py inside it
COPY . .

EXPOSE 8007
# 👇 run uvicorn (no [standard] here)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007", "--reload"]
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# optional: uvicorn --reload uses watchfiles automatically if present
RUN pip install --no-cache-dir watchfiles

# make sure this COPY brings in your "app/" folder with main.py inside it
COPY . .

EXPOSE 8007
# 👇 run uvicorn (no [standard] here)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007", "--reload"]
