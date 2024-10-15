
@echo off
start "" /B mlflow server
start "" /B npm run dev
start "" /B uvicorn main:app --host 127.0.0.1 --port 8000 --reload
