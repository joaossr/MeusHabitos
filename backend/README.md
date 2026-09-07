# Backend local — Hábitos

## Tecnologia

- Python
- Flask
- SQLite
- Flask-CORS

O banco é criado automaticamente em:

`backend/data/habitos.db`

## Rodar no Windows

Dê duplo clique em:

`run.bat`

Ou no terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app\app.py
```

API:

`http://127.0.0.1:8000`

Teste:

`http://127.0.0.1:8000/api/health`

## Rodar no Linux/macOS

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app/app.py
```

## Banco

O SQLite é um arquivo local. Para fazer backup, basta copiar:

`backend/data/habitos.db`

Para restaurar, substitua o arquivo por uma cópia de backup enquanto o servidor estiver parado.

## Importante

Este backend é independente do Patrimônio 360.
