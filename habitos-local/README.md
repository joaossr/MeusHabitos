# Hábitos — aplicação local

Esta versão contém o frontend original e agora também um backend em Python + SQLite.

## Estrutura

- `index.html` — frontend
- `styles.css` — visual
- `app.js` — interface da versão local
- `backend/app/app.py` — API Python
- `backend/data/habitos.db` — banco SQLite criado ao iniciar o backend
- `backend/run.bat` — inicialização rápida no Windows
- `backend/run.sh` — inicialização no Linux/macOS

## Backend

Leia `backend/README.md`.

## Importante

O frontend atual ainda salva seus dados no `localStorage`. O backend foi criado e está pronto para ser conectado ao frontend em uma segunda etapa.

Assim você pode testar o banco e a API sem perder a versão visual que já estava funcionando.

O projeto é completamente separado do Patrimônio 360.
