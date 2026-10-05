FROM python:3.10-slim

WORKDIR /app

RUN pip install fastapi uvicorn

COPY . .

CMD ["uvicorn", "yamcs_mock:app", "--host", "0.0.0.0", "--port", "8090"]