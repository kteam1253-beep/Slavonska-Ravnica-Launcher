---
name: sr-launcher-v2-project
description: SR Launcher V2 za Farming Simulator 25 - kompletna Electron desktop aplikacija
metadata:
  type: project
---

SR Launcher V2 je kompletna Electron/React desktop aplikacija za FS25 multiplayer sinkronizaciju modova.

**Why:** Korisnik treba profesionalni launcher koji sinkronizira lokalne modove s modovima na multiplayer serveru.

**How to apply:** Ovo je osnova projekta - sve promjene idu na ovaj projekt.

## Tehnički stack
- Electron 28 + electron-vite 2
- React 18 + TypeScript
- Tailwind CSS (dark tema, gold #F5C518 akcenti)
- Zustand (state management)
- better-sqlite3 (SQLite database) - NATIVE MODULE, treba rebuild za Electron
- Discord OAuth2 (lokalni HTTP server na portu 3847)

## Ključni detalji

### Native modules
better-sqlite3 mora biti rebuildan za Electron:
```bash
npx @electron/rebuild -f -w better-sqlite3 -v 28.2.0
```
Ili `npm install --ignore-scripts` pa rebuild.

### Build
- Dev: `npm run dev`
- Build: `npm run build`
- Dist (Windows installer): `npm run dist`

Build VERIFICIRAN - radi. Artefakti u `release/`:
- `SlavonskaRavnica-Setup-1.0.0.exe` (NSIS installer, ~77 MB)
- `Slavonska Ravnica 1.0.0.exe` (portable, ~77 MB)
- `latest.yml` (auto-updater metadata)

### Poznati build problemi i rješenja (Windows, bez admin prava)
1. **cpu-features build greška** (opcionalna ssh2 zavisnost) → obriši `node_modules/cpu-features`, nije potreban.
2. **better-sqlite3 native** → `npx @electron/rebuild --only better-sqlite3 -v 28.2.0`. U electron-builder.json5 je `npmRebuild: false` + `asarUnpack` za better-sqlite3.
3. **winCodeSign symlink greška** ("Cannot create symbolic link: A required privilege is not held") — Windows ne može stvarati macOS symlinkove iz arhive bez Developer Mode/admin. RJEŠENJE: pre-puni cache wrapperom koji forsira exit 0:
   - Wrapper `7za.bat`: poziva pravi `node_modules/7zip-bin/win/x64/7za.exe %*` pa `exit /b 0`
   - Dodaj wrapper dir na PATH, pokreni `node_modules/app-builder-bin/win/x64/app-builder.exe download-artifact --name winCodeSign`
   - Stvara `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0` koji electron-builder poslije samo iskoristi.
   - Alternativa: omogućiti Developer Mode (treba admin) ili pokrenuti build kao admin.

### Gdje su datoteke
- `src/main/` - Electron main process + IPC handleri
- `src/preload/` - contextBridge API izložen rendereru
- `src/renderer/src/` - React app (komponente, store, stranice)
- `backend/services/` - Discord, FTP, SFTP, REST API, Download, Mod sync servisi
- `database/database.ts` - SQLite inicijalizacija i schema
- `src/shared/types.ts` - Svi TypeScript tipovi

### Discord OAuth flow
- Lokalni HTTP server na portu 3847
- Redirects: http://localhost:3847/callback
- Rola se provjerava via Bot Token + Guild API

### VAZNO: Online detekcija (ping)
FS25 GAME port (npr. 11363) je UDP - NE moze se TCP-pingati, uvijek ispada offline.
Provjereno za test server 176.57.169.250: game 11363=UDP, FTP 50561=TCP OPEN, query 27555=UDP, WEB 8620=TCP OPEN.
RJESENJE (server.service.ts pingServer): za ftp/sftp pingaj CISTI server.ip na FTP/SFTP portu (TCP otvoren = "server box gore").
Dashboard se auto-pinga (useEffect na activeServer.id + handleSync). Launch dugme VISE NIJE blokiran kad offline.
`net-util.ts` ima sanitizeHost() - strip ftp://, user:pass@, :port - da puni FTP URL u host polju ne razbije konekciju.

### KRITICNO: detekcija promjene sadrzaja moda (isti version, drugi sadrzaj)
Korisnik (admin) mijenja sadrzaj moda BEZ mijenjanja verzije; velicina varira. Zato usporedba po verziji NIJE dovoljna.
GIANTS feed hash se mijenja kad se sadrzaj promijeni, ali NIJE reproducibilan lokalno (probao md5 fajla/modDesc/concat uncompressed/CRC - nista ne pogadja feed hash).
RJESENJE: praćenje feed hasha kroz vrijeme. Tablica `mod_state(server_id, file_name, known_hash)`.
compareMods: prvi put zabiljezi known_hash=trenutni feed hash (OK). Kasnije: known==trenutni => OK, razlika => UPDATE.
download.service nakon uspjeha zove modSyncService.setKnownHash(serverId, fileName, serverHash). Tako admin: promijeni mod na serveru -> Osvjezi -> UPDATE.

### OPREZ: NE force-killati app (ostecuje SQLite bazu!)
Ponavljano `Stop-Process -Force` tijekom rebuildova OSTETILO je SQLite bazu (integrity_check: invalid page number na vise tablica).
Baza je u %APPDATA%/Slavonska Ravnica/sr-launcher.db (WAL mode). Za gasenje koristi CloseMainWindow() (graceful), force samo kao zadnja opcija.
Recovery: py (ima ugradjeni sqlite3; system node NE moze jer better-sqlite3 je za Electron ABI). Dump dobrih tablica (servers/settings/auth_session) -> obrisi db/wal/shm -> rekreiraj schema + insert. mods/logs/downloads su disposable (app ih rekreira).

### Mod sync preko FS25 web feeda (izvor istine)
Ako server ima webStatsPort+webApiCode, mod-sync.service.getServerMods koristi fsStatsService.fetchServerMods (NE FTP).
Download endpoint (PROVJERENO na test serveru): GET http://IP:8620/mods/<ModName>.zip - HTTP 200, application/zip, BEZ koda.
GIANTS server NE podrzava Range -> nema HTTP resume, skida se cijeli fajl. NE podrzava HEAD (501).
KRITICNO: GIANTS feed hash (32 hex) NIJE reproducibilan MD5 fajla! Provjereno: skinuti BS25_Roll_Coal.zip ima MD5 4ec8466b..., a feed hash je 777b88d4... - NE poklapaju se. GIANTS racuna hash interno.
ZATO se usporedba radi po VERZIJI iz modDesc.xml, NE po hashu. Potvrdeno: lokalni modDesc <version> == feed version za nepromijenjene modove (npr. precisionFarming 1.5.1.0 == 1.5.1.0).
yauzl cita modDesc.xml <version> iz svakog lokalnog zipa (readModDescVersion u mod-sync.service.ts). normalizeVersion() pad-a na 4 dijela.
compareMods: nema lokalno=FALI, verzije se poklapaju=OK, razlikuju=UPDATE, lokalno-only=NOVI. SHA256 (64hex) hash usporedba samo za custom REST.
fileName = <Mod name> + ".zip". download.service bira HTTP ako mod.serverPath pocinje s http. Feed mod serverHash='' pa download radi PK-magic+size provjeru umjesto checksuma.

### FS25 Web Stats feed (live igraci/mapa/verzija)
FS25 dedicated server ima web panel (port 8620 za test server) sa stats feedom:
`http://IP:WEBPORT/feed/dedicated-server-stats.xml?code=WEB_API_CODE`
Bez koda vraca "Error 401". XML ima <Server version mapName name> i <Slots numUsed capacity> + <Mod name version>.
`fs-stats.service.ts` dohvaca/parsira (regex). pingServer prvo proba web stats ako su webStatsPort+webApiCode postavljeni, inace fallback na TCP ping.
Polja webStatsPort/webApiCode u GameServer tipu, DB (s migracijom runMigrations()), ServerModal.
ServerModal ima i rucna polja Mapa/Verzija/Max igraca kao fallback bez koda.
Korisnik mora naci Web API kod na svom hosting panelu (G-Portal) - prikazan kao ?code= u stats URL-u.

### VAZNO: Bootstrap deadlock i rjesenje
Postavke (ukljucujuci Discord credentials) su iza login ekrana, ali login treba Discord credentials = zacarani krug.
RJESENJE: `DiscordLogin.tsx` ima dugme "Konfiguriraj Discord" koje otvara `DiscordConfigModal.tsx` (components/auth/).
Admin tu unese Client ID/Secret/Guild/Bot Token/Role ID PRIJE prijave. Sprema u SQLite preko saveSettings.
`.env.example` je SAMO referenca - kod ga NE cita. Sve konfiguracije idu kroz UI u bazu.

### Distribucija igracima: Render backend (zero-config)
`server/` folder = deployable Node/Express backend za Render. Drzi SVE tajne (Client Secret). Klijent zna samo BACKEND_URL.
Backend (server/index.js): /auth/start (redirect na Discord), /auth/callback (token exchange + role check preko KORISNIKOVOG tokena, bez bot tokena), /auth/result (polling), /auth/me (re-verify), /config (servers.json, samo s rolom). JWT sesije.
Klijent: `src/shared/app-config.ts` BACKEND_URL konstanta. Prazna = LOKALNI flow. Postavljena = backend flow.
DEPLOYAN: BACKEND_URL = https://sr-launcher-backend.onrender.com (Render, /health, /auth/start i /config idu preko tog backenda). Igracka verzija .exe je u backend mode-u.
Render napomene: treba Variable PORT=8080 (domena gada 8080) + PUBLIC_URL MORA imati https:// prefix.
`backend-auth.service.ts` (login polling, verify, fetchConfig). auth.ipc.ts grana na isBackendMode(). server.service.upsertServersFromConfig() upserta servere po backend id-u.
Igraci NE trebaju: bot token, FTP (modovi preko javnog http linka), nikakvu konfiguraciju. Samo instaliraju .exe + Discord login.
Admin koraci: deploy server/ na Render (root=server), env vars (CLIENT_ID/SECRET/GUILD_ID/ROLE_ID/JWT_SECRET/PUBLIC_URL), Discord redirect = PUBLIC_URL/auth/callback, stavi URL u app-config.ts, rebuild .exe.
servers.json na backendu = central config (promijeni server bez novog .exe). webApiCode je read-only (ok), FTP lozinka NE ide tu.
servers.json ima OBA servera: sr-main (Slavonska ravnica, 176.57.169.250, web 8620, oXuXiWxTnqiShUny) i sr-test (Slavonska ravnica - test, 51.89.3.249, web 8080, e3dmikatjhjum55z2bxrg2hncvkl).
upsertServersFromConfig BRISE servere kojih nema u configu (lista = backend tocno). Samo radi kad config nije prazan (failed fetch = [] = nista ne dira).

### Upload modova (admin feature)
"Upload Modove" dugme na Modovi stranici - vidljivo SAMO kad aktivni server ima ftpUsername ili sftpUsername (admin).
upload.service.ts = sekvencijalni red (jedan po jedan), progress/brzina/ETA, cancel. ftp.service.uploadFile (basic-ftp uploadFrom + trackProgress), sftp.service.uploadFile (fastPut).
IPC: upload.ipc.ts (select-files dialog multi-select zip, enqueue, get-queue, cancel, clear-finished). Eventi upload:queue-update, upload:progress. upload.store.ts + UploadPanel u Mods.tsx.
VAZNO: backend /config NE salje FTP podatke (igraci ih nemaju), pa upsertServersFromConfig NE dira ftp_* polja - admin rucno doda FTP u Serveri>uredi i ostaju (upload dugme se pojavi).

### GitHub repoi
- Backend (Render izvor): github.com/ktomasic66-coder/sr-launcher-backend (servers.json se mijenja ovdje -> Render auto-redeploy).
- Igracki installer (javni): github.com/ktomasic66-coder/SlavonskaRavnica-launcher (.exe + README). Lokalni klon: C:\Users\ktoma.KIKI\Desktop\SR-Launcher-Release (git push za novu verziju).
- Git credential helper warning "credential-manager-core not a git command" je kozmeticki - push svejedno radi (cached creds).

### Logo / ikona
Pravi SR logo (zlatni SR + psenica + brazde, transparentna pozadina): `assets/icons/logo.png` (izvor 512x512 RGBA), `assets/icons/icon.png` (build ikona, electron-builder generira .ico).
Kopija za UI: `src/renderer/src/assets/logo.png`, importa se u App.tsx (loading), DiscordLogin.tsx (login), TitleBar.tsx. vite-env.d.ts daje tipove za *.png import.
TRIK za dohvat transparentnog PNG iz clipboarda (Clipboard.GetImage() spljosti na crno): koristi `[Windows.Forms.Clipboard]::GetData("PNG")` -> MemoryStream s alpha kanalom.

### Boja tema
- Background: #0a0a0a
- Panels: #111111
- Gold accent: #F5C518
- Success: #22c55e, Warning: #f97316, Error: #ef4444, New: #3b82f6
