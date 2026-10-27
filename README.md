# London 26 🇬🇧⚽

En statisk nettside for gjengens tur til Marius i London, 6.–8. november 2026. Høydepunktet er Fulham–Newcastle på Craven Cottage lørdag 7. november.

## Innhold

- **Program** gir en dag-for-dag-plan (fredag til søndag) med lenker til kart og veibeskrivelse.
- **Kart** er interaktivt (Leaflet + OpenStreetMap), med hotell, Marius, stadion, puber, mat, aktiviteter og T-bane. Ruta til kampen er tegnet inn.
- **Spis & drikk** og **Ting å gjøre** viser steder sortert etter avstand fra hotellet, med gangtid til både hotellet og Marius.
- **London-cupen 🏆** er konkurransen som går gjennom hele helgen:
  - **Oppdrag (side quests):** poeng for å fullføre små utfordringer underveis
  - **Kamptips:** resultat, første målscorer og antall gule kort
  - **London-quiz:** kjøres på vors hos Marius. Den er skjult inntil videre; åpne siden med `?quiz` i adressen (f.eks. `.../london26/?quiz#cupen`) for å vise den, eller sett `showQuiz: true` i `js/data.js`.
  - **Finale:** minigolf på Puttshack søndag, med plasseringspoeng
  - **Lagtrekning** og fri utdeling av pluss- og minuspoeng (med logg og angre)
  - Vinneren blir **Kongen av Kensington**, og sistemann spanderer første runde.
- **Praktisk** samler betaling på T-banen, flyplasstransport, kampregler, Remembrance Sunday og nødnummer.

## Slik fungerer poengtavla

Siden er helt statisk og har ingen server. Én person er **dommer** og fører poengene på mobilen sin (lagres i nettleseren). Med **«Del lenke»** lages en lenke som inneholder hele stillingen. Den sendes i gruppechatten, og de som åpner den, kan laste stillingen inn hos seg. **«Kopier tekst»** gir en kort stillingsliste klar til å lime inn i chatten.

## Publisere med GitHub Pages

1. Gå til **Settings → Pages** i repoet.
2. Under *Build and deployment*, velg **Deploy from a branch** og velg branchen med koden og mappen `/ (root)`.
3. Siden blir tilgjengelig på `https://<brukernavn>.github.io/london26/`.

Lokalt: `python3 -m http.server` i mappen, og åpne http://localhost:8000. Ikke dobbeltklikk på `index.html`, for OpenStreetMap avviser kartfliser til sider som åpnes direkte som fil (`file://`).

## Endre innhold

Alt innhold ligger i [`js/data.js`](js/data.js):

- `TRIP`: datoer, avsparkstid og deltakere
- `PLACES`: steder på kartet (koordinatene er omtrentlige, men «Google Maps»-lenkene søker på navn og adresse)
- `PROGRAM`: tidsplanen
- `QUESTS`, `PENALTIES`, `QUIZ`: innholdet i London-cupen (Marius bør gjerne legge inn egne spørsmål!)
- `PRACTICAL`: praktisk info

> ⚠️ Avspark er satt til lørdag 7. november kl. 15:00. Premier League-kamper kan bli flyttet på grunn av TV, så sjekk tidspunktet nærmere kampen. Husk også å bestille bord for 8 der det er nevnt.

Leaflet 1.9.4 ligger i `vendor/leaflet` (BSD-2-lisens).
