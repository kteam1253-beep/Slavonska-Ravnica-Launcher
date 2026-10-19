# SR Launcher V2 — Slavonska Ravnica

Profesionalni multiplayer launcher za Farming Simulator 25.

## Zahtjevi

- Node.js 18+
- npm 9+
- Windows 10/11 x64

## Instalacija

```bash
npm install
```

## Pokretanje za razvoj

```bash
npm run dev
```

## Build

```bash
npm run dist
```

Installer se nalazi u `release/` folderu kao `SlavonskaRavnica-Setup-{version}.exe`.

## Konfiguracija

Sve postavke se konfiguriraju putem UI-a u kategoriji **Postavke**.

### Discord OAuth2

1. Idite na [Discord Developer Portal](https://discord.com/developers/applications)
2. Kreirajte novu aplikaciju
3. U OAuth2 > Redirects dodajte: `http://localhost:3847/callback`
4. Kopirajte **Client ID** i **Client Secret**
5. Kreirajte Discord Bota i kopirajte **Bot Token**
6. Pronađite **Guild ID** (desni klik na server > Kopiraj ID)
7. Pronađite **Role ID** (Server Settings > Roles > desni klik > Kopiraj ID)
8. Unesite sve u Postavke > Discord Integracija

### Farming Simulator 25

- Odaberite `FarmingSimulator2025.exe` (obično `C:\Program Files\Farming Simulator 2025\`)
- Mods folder se automatski pronalazi: `Documents\My Games\FarmingSimulator2025\mods`

### Server veza

Podržano je:
- **FTP** — standardni FTP server
- **SFTP** — SSH FTP
- **REST API** — custom HTTP API

## Struktura projekta

```
SR Launcher V2/
├── src/
│   ├── main/          # Electron main process
│   ├── preload/       # Preload / contextBridge
│   ├── renderer/      # React frontend
│   └── shared/        # Dijeljeni TypeScript tipovi
├── backend/
│   └── services/      # Discord, FTP, SFTP, REST, Download servisi
├── database/          # SQLite schema i inicijalizacija
├── updater/           # Auto-updater
└── assets/            # Ikone i resursi
```

## Sinkronizacija modova

Launcher uspoređuje lokalne modove s modovima na serveru:

| Status   | Opis                                          |
|----------|-----------------------------------------------|
| `OK`     | Mod postoji lokalno i poklapa se s verzijom   |
| `UPDATE` | Postoji novija verzija na serveru             |
| `NOVI`   | Mod postoji lokalno ali ne i na serveru       |
| `FALI`   | Mod postoji na serveru ali ne lokalno         |
| `GREŠKA` | Checksum (SHA256) se ne poklapa               |

## Licenca

© 2024 Slavonska Ravnica. Sva prava pridržana.
