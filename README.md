# ÕpiAbi

ÕpiAbi on eestikeelne, mobiilisõbralik õpperakendus, mis aitab õpilasel jälgida aineid ja teemasid, korrata mälukaarte, planeerida kontrolltööks valmistumist ning õppida rahulikus tempos.

## Kasutamine

Rakendus ei vaja Node.js-i, pakette, andmebaasi ega ehitussamme. Kopeeri `index.html`, `css/` ja `js/` veebiserverisse nii, et `index.html` oleks avaleht, ning ava rakendus veebibrauseris. JavaScripti moodulite tõttu peab rakendust kasutama HTTP(S)-i kaudu (näiteks veebiserverist), mitte avama `index.html` otse `file://` aadressilt. Rakendus ei laadi väliseid teeke ega CDN-e.

Esimesel käivitamisel lisatakse näidisandmetesse matemaatika aine, murdude teema ja kaks mälukaarti ning kuvatakse lühike juhend. Kasutaja saab seejärel:

- lisada aineid, teemasid ja määrata iga teema arusaamise taseme 1–5;
- näha ülevaates madalama hinnangu, ammu kordamata või kordamist ootavaid teemasid;
- lisada teemadele küsimuse-vastuse kaarte ning hinnata kordamist nuppudega „Ei teadnud”, „Raske” ja „Teadsin”;
- kasutada teemaga seotud fookustaimerit (vaikimisi 25 minutit) ja salvestada õppimise sessioonid;
- sisestada kontrolltöö kuupäeva ja saada kuupäevadele jaotatud kordamisplaani;
- vaadata nädalast õppimisaega, ainete lõikes jaotust, kordamiste arvu ja õppimisjada;
- vahetada heleda/tumeda režiimi vahel ning eksportida/importida andmeid JSON-failina.

## Andmete salvestamine ja varundamine

Kõik ained, teemad, kaardid, õppimissessioonid, plaanid ja eelistused salvestatakse ainult selle brauseri `localStorage`-isse. Andmeid ei saadeta serverisse. Teise seadmesse viimiseks kasuta ülariba ekspordi- ja imporditoiminguid. Brauseri andmete kustutamine kustutab ka ÕpiAbi salvestuse, seega ekspordi varukoopia regulaarselt.

Rakendus ei vaja kasutamiseks PHP-d. `contact.php` ega serveripoolset tagasiside salvestamist ei ole lisatud, kuna funktsioon on valikuline ja tuumikrakendus töötab staatiliste failidena.

## Ligipääsetavus ja tehniline ülesehitus

Liides kasutab semantilisi elemente, klaviatuuriga kasutatavaid juhtnuppe, nähtavaid fookusolekuid, vormisilte, vähendatud liikumise eelistuse tuge ning kohanduvat paigutust. Graafik joonistatakse SVG-ga.

- `index.html` — rakenduse vaated ja vormid
- `css/style.css` — kujundus, teemad ja mobiilipaigutus
- `js/storage.js` — kohalik salvestus, andmevorming ja import
- `js/subjects.js` — ainete ja teemade haldus
- `js/flashcards.js` — mälukaardid ja lihtsustatud SM-2 kordamisintervallid
- `js/timer.js` — fookus-/pausitaimer ja õppimissessioonid
- `js/planner.js` — kontrolltöö plaan
- `js/stats.js` — ülevaade, statistika ja SVG-graafik
- `js/app.js` — rakenduse käivitamine, navigeerimine ja import/eksport
