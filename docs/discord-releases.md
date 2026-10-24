# Discord obavijesti o verzijama

U Discord kanalu napravi webhook (Uredi kanal → Integracije → Webhooks).
U GitHub repozitoriju otvori Settings → Secrets and variables → Actions i dodaj
repository secret `DISCORD_RELEASE_WEBHOOK_URL` s URL-om tog webhooka.
URL nemoj spremati u izvorni kod.

Workflow `Release Launcher` nakon uspjesnog builda i objave salje obicnu tekstualnu Discord
poruku s opisom iz GitHub Release biljeski i gumbom **Preuzmi launcher**.
Gumb koristi stvarni URL objavljenog `SlavonskaRavnica-Setup-<verzija>.exe`
asset-a, nikad portable izdanje. Svaka nova poruka vodi na svoju verziju.
Poruka nema embed, a dugacke biljeske skracuju se na Discord limit od 2000 znakova.
Biljeske pripremi u draft releaseu prije pokretanja objave ako zelis vlastiti
popis promjena u poruci; naknadno uredjivanje biljeski ne mijenja Discord poruku.

Za novu verziju uskladi package.json i package-lock.json te objavi odgovarajuci
`v<verzija>` tag. Obavijest se salje tek nakon dovrsetka postojeceg release
workflowa, jer objava preko GITHUB_TOKEN-a ne pokrece drugi release workflow.
Draft i prerelease izdanja se preskacu. Bez webhook secreta build se nastavlja
uz upozorenje, ali nema Discord poruke. Neuspjelo slanje oznacava workflow
neuspjesnim, a vec objavljeno izdanje ostaje dostupno.

Ponovno pokretanje workflowa salje novu poruku: prije ponavljanja provjeri kanal.
Rucno objavljivanje izvan ovog workflowa ne salje obavijest.
