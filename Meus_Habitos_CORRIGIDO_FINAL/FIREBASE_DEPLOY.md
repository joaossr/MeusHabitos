# Colocar o sistema online com Firebase

## 1. Criar projeto
No Firebase Console:
1. Crie um projeto.
2. Adicione um aplicativo Web (`</>`).
3. Copie a configuração do SDK.
4. Cole os valores em `habitos-local/firebase-config.js`.

## 2. Ativar login
Em Authentication > Sign-in method, ative:
- Anonymous

A versão atual usa login anônimo para cada navegador/dispositivo. Isso permite sincronizar o mesmo usuário daquele dispositivo, mas não é ainda um sistema de conta por e-mail.

## 3. Criar Firestore
Em Firestore Database, crie o banco em produção.
Depois publique as regras deste pacote.

## 4. Instalar Firebase CLI
No PowerShell:

```powershell
npm install -g firebase-tools
firebase login
```

## 5. Dentro da pasta do projeto

```powershell
firebase init
```

Se perguntar:
- Hosting: use a configuração existente quando possível.
- Firestore: use `firestore.rules`.
- Public directory: `habitos-local`
- Single-page app: `Yes`

Como `firebase.json` já está neste pacote, você também pode revisar o arquivo e executar:

```powershell
firebase deploy
```

## 6. O que acontece
O navegador passa a funcionar assim:

Usuário → Firebase Hosting → aplicação web → Firebase Authentication → Firestore

O estado do sistema é sincronizado em:
`users/{uid}/app/state`

A aplicação continua funcionando localmente se o Firebase ainda não estiver configurado, usando localStorage como fallback.

## Importante
O Firebase config da Web pode ficar no frontend. O que protege os dados são as regras do Firestore e o Authentication.

A sincronização atual é uma base funcional. Para produção com vários usuários, o próximo passo recomendado é migrar de um único documento de estado para coleções separadas de usuários, hábitos, metas, conclusões, XP, conquistas e missões, com regras por usuário.
