# SR Launcher Backend (Railway)

Mali auth + config servis. Drzi sve tajne server-side. Igracki launcher zna samo javni `PUBLIC_URL` ovog backenda.

## Sto radi

- OAuth token exchange s Discordom
- Provjera Discord role preko korisnikovog tokena
- Servira centralni config servera iz Railway MySQL baze
- Admin iz launchera moze spremiti izmjene servera/FTP podataka na backend

## Deploy na Railway

1. Napravi Railway service iz GitHub repo-a.
2. Postavi:
   ```text
   Root Directory: server
   Build Command: npm install
   Start Command: npm start
   ```
3. U service varijable dodaj Discord/JWT varijable:
   ```text
   DISCORD_CLIENT_ID
   DISCORD_CLIENT_SECRET
   DISCORD_GUILD_ID
   DISCORD_REQUIRED_ROLE_ID
   DISCORD_UPLOAD_ROLE_IDS
   DISCORD_BOT_TOKEN
   DISCORD_MOD_CHANNEL_ID=1487478328007987471
   JWT_SECRET
   PUBLIC_URL=https://tvoj-railway-url.up.railway.app
   ```
4. Spoji MySQL bazu na app service preko Railway Variable Reference. Dovoljno je dodati:
   ```text
   MYSQL_URL=${{MySQL.MYSQL_URL}}
   ```
   Backend podrzava i `MYSQL_PUBLIC_URL`, ali za Railway app service koristi `MYSQL_URL`
   jer ide internom mrezom.
5. U Discord Developer Portal dodaj redirect:
   ```text
   https://tvoj-railway-url.up.railway.app/auth/callback
   ```

## Provjera

Otvori:

```text
https://tvoj-railway-url.up.railway.app/health
```

Trebas vidjeti JSON odgovor s `ok: true`.

## Mijenjanje servera i FTP podataka

Kad je `MYSQL_URL` postavljen, backend automatski napravi tablicu `launcher_servers`.
Prvi put ce napuniti bazu iz `servers.json` ako je tablica prazna.

Admin u launcheru otvori **Serveri > Uredi Server**, promijeni IP, port, FTP host,
FTP username/password, remote path ili Web API code i klikne **Spremi Izmjene**.
Launcher salje izmjenu na backend, backend je sprema u MySQL, a drugi korisnici
dobiju novi config kad se launcher prijavi/provjeri sesiju ili kad se osvjezi lista servera.

Ako `MYSQL_URL` nije postavljen, backend se vraca na fallback i cita/pise `servers.json`.
