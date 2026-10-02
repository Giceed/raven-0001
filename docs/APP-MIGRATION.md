# Raven: gemeinsame App-Basis, iOS zuerst

Stand: 02.10.2026. Ausgangspunkt ist GitHub `Giceed/raven-0001`; die
Capacitor-App wird im Zweig `codex/capacitor-ios-first` vorbereitet. Der
Hauptzweig `main` und damit die veröffentlichte Webversion bleiben unberührt.

## Versionsbefund

Die lokal gesicherte V4.8 **„Deutschland erwacht“** wurde gefunden, geprüft und
vollständig in den App-Zweig übernommen. Sie ist die eingefrorene
Gameplay-Referenz für die App-Migration.

## Bestandsaufnahme

| Bereich | Ist-Stand und Folge für die Migration |
| --- | --- |
| Oberfläche | Statisches `index.html`, `css/raven.css`, geordnet geladene klassische Skripte mit gemeinsamen globalen Variablen und Inline-Handlern. Kein Framework, Paketmanager oder Buildsystem vorhanden. Reihenfolge erhalten; keine Umstellung auf React oder ES-Module erforderlich. |
| Spielablauf | Habitat/Karte im Hauptdokument, `raven-life.js`, `raven-jumper.js`, `poi.js`, `hub-flow.js`, Fog und Reisebuch bleiben erhalten. `habitat/`, `studio/`, `simulation/` sind zusätzliche Entwicklerseiten, keine neue App-Architektur. |
| Abhängigkeiten | Leaflet 1.9.4 bislang per unpkg-CDN; App-Build kopiert exakt diese Version samt CSS, Bildern und Lizenz aus dem gesperrten Paketstand lokal. Keine anderen externen Laufzeitbibliotheken in den untersuchten HTML-Seiten. |
| GPS | `js/gps.js` nutzt `navigator.geolocation.watchPosition`/`clearWatch`, hohe Genauigkeit, 20 s Timeout, 35 m Genauigkeitsschwelle und Bewegungsregeln bei 12/20 km/h. Keine native Plugin-Anbindung, keine Hintergrundortung. Fehler setzt tracking=false, räumt aber den Watch nicht auf: vor Gerätefreigabe beheben. |
| Speicherung | Viele direkte synchrone localStorage-Zugriffe, auch außerhalb `storage.js`: Profil, Tier, Items, XP, Fog, Touren, Studio-Daten und Diagnose. Versions- und Test-Resetmarker in `config.js`/`storage.js` beachten. Kein Backend und kein Account-Sync. Safari/PWA- und native App-Speicher sind getrennt; Spielstände wandern nicht automatisch mit. |
| PWA | Manifest startet mit `view=player`. Service Worker `raven-app-v69` hält 32 lokale Shell-Ressourcen vor; externe CDN-Dateien/Kartenkacheln werden nicht gecacht. App-Bundle verwendet eigenen Startcode, keinen SW und keinen Installationsknopf. Web-PWA bleibt unverändert. |
| Karte | Leaflet, OSM-Kacheln, lokale Fürstenberg-Geometrie, POIs, Fog und Radiuslogik. Nominatim für Ortsauflösung/Grenzen; reguläre Aufrufe werden auf 60 s und 100 m begrenzt. Bots verwenden öffentliche Fuß-/Auto-Routingdienste; Studio/Review zusätzlich Overpass. Diese Dienste bleiben netzabhängig. |
| Studio-Abgleich | `shared-pois.js` liest zuerst `ravenSharedPoisLive`, sonst mitgeliefertes JSON. Das ist lokaler Austausch auf derselben Origin, kein geräteübergreifender Live-Sync. |
| Geräteoberfläche | Keine systematische Safe-Area-Behandlung erkennbar. Tastatur, Notch, Querformat, Canvas-Gesten, Hintergrundwechsel und TXT-Downloads müssen auf iPhone geprüft werden. Download-Links sind noch kein nativer Teilen-Dialog. |

## Bereits vorbereitet

- Capacitor 8.5.2, gemeinsame Konfiguration, generierte Projekte `ios/` und `android/`.
- Vorläufige Bundle-ID `com.giceed.raven0001`; vor Signierung verbindlich festlegen.
- `tools/build-app.mjs` erzeugt ausschließlich `dist/`, verwendet eine feste
  Asset-Liste und erhält Skriptreihenfolge, Daten und relative Unterseitenpfade.
- App-Start setzt `view=player`, verwendet lokale Leaflet-Dateien, blendet den
  Installationsknopf aus und erhält die Verbindungsanzeige. Native Assets werden
  über Capacitor synchronisiert, nicht von einer entfernten Start-URL geladen.
- iOS- und Android-Standortberechtigungen sind eingetragen. Der GPS-Start ist
  gegen doppelte und verspätete Watcher abgesichert. Beim Hintergrundwechsel
  wird die Ortung pausiert; beim Fortsetzen wird die letzte Position verworfen,
  damit keine falsche Distanz über die App-Pause entsteht.
- Die App verwendet derzeit die Geolocation der nativen WebView. Eine Adapter-
  Schnittstelle für `@capacitor/geolocation` und `@capacitor/app` ist vorhanden;
  die Plugin-Pakete müssen vor dem Gerätebuild noch installiert und synchronisiert
  werden. Bis dahin übernimmt `visibilitychange` den Lifecycle-Fallback.
- Der App-Build lädt vor der Spiellogik eine Speicherbrücke. Sie führt zwei
  rotierende, mit Prüfsumme versehene Spielstand-Sicherungen und sichert beim
  Hintergrundwechsel sofort. Import und Wiederherstellung wurden getestet.
  Sobald `@capacitor/preferences` verfügbar ist, spiegelt dieselbe Brücke den
  Snapshot zusätzlich in den nativen App-Speicher und stellt einen neueren
  nativen Stand vor dem endgültigen Spielstart wieder her.
- Originale Webdateien, PWA, Spiellogik und Daten wurden nicht editiert.
- Lockfile für reproduzierbare Installation. Generierte öffentliche Assets,
  Abhängigkeiten und private Signierungsdateien werden nicht eingecheckt.

## Ausführen

Node 22 oder neuer und pnpm 11.19.0 verwenden:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run cap:sync
```

Die Plattformprojekte sind schon vorhanden; `cap add` nicht erneut ausführen.
Die Webversion weiterhin wie bisher vom Repository-Stamm statisch ausliefern;
`dist/` ist ausdrücklich der native Build ohne PWA-Installation.

Auf einem Mac/Remote-Mac mit Xcode 26 oder neuer:

```sh
pnpm exec cap open ios
```

Swift Package Manager ist eingerichtet. Zuerst im iOS-Simulator bauen und
prüfen. Danach mit der festgelegten Apple-Team-ID und Signierung ein Gerätebuild
erstellen. Für einen Windows-basierten Ablauf ist ein macOS-CI-/Remote-Build
sinnvoll; TestFlight ist ein möglicher Weg aufs iPhone. Apple-Entwicklerkonto,
Signierung und konkreter Build-Dienst sind noch nicht eingerichtet. Hier wurde
weder ein signiertes IPA noch ein Store-Upload erstellt. Android verwendet
dieselbe Webbasis und wird nach dem ersten iPhone-Test mitgeprüft.

## Nächste Schritte in sinnvoller Reihenfolge

1. **Referenz eingefroren.** V4.8 „Deutschland erwacht“ ist die festgeschriebene
   Gameplay-Basis. Während der Migration keine neuen Spielwerte, Features oder
   Kartendaten nebenbei ändern.
2. **Native Plugins synchronisieren.** `@capacitor/geolocation` und
   `@capacitor/app` installieren, anschließend `cap sync` ausführen und die
   vorbereitete Adapterschicht auf einem echten Gerät prüfen. Die Berechtigung
   wird erst beim Start einer Erkundung angefragt.
3. **App-Lifecycle auf dem Gerät abnehmen.** Beim Verlassen wird GPS pausiert und
   der Watch zuverlässig entfernt. Beim Zurückkehren wird der letzte Fix
   zurückgesetzt, damit keine Distanz über die Pause hinweg gutgeschrieben wird.
   Kein automatisches Tourende und keine verlorene
   Tourzusammenfassung. V1 zunächst Vordergrundortung; Sperrbildschirm bedeutet
   keine zugesicherte Aufzeichnung. Hintergrundortung wäre eine eigene Entscheidung.
4. **Nativen Spielstand auf dem Gerät abnehmen.** `@capacitor/preferences`
   installieren und synchronisieren; Wiederherstellung, Prozessende,
   fehlerhafte Sicherung sowie Export/Import auf dem iPhone prüfen. Für größere
   Weg-/Fog-Daten Dateispeicher oder SQLite erst nach echten Größenmessungen
   entscheiden. Preferences braucht außerdem Apples Privacy-Manifest-Angaben.
5. **Karte und Geräte-UI prüfen.** Alle HTTPS-Dienste unter echter Capacitor-
   Origin testen (CORS, Ausfall, Wiederverbindung); Provider-Nutzungsbedingungen
   und Identifikation vor breiter Nutzung prüfen. Keine pauschale Netzfreigabe,
   kein Massen-Offlinekachelcache. Safe Areas, Tastatur und Canvas auf echtem
   iPhone prüfen. Entwicklerexporte später über Filesystem/Share anbinden.
6. **iPhone-Abnahme, dann Android.** Frischstart → Benennen → Habitat → Tour →
   GPS → POI/Radius → Rubbeln/Items/XP → Rückkehrbericht → Neustart. Dazu
   Rechteverweigerung, Flugmodus, Appwechsel/Sperrbildschirm, Prozessende,
   Speicherfehler, schlechter Fix und schnelles Stop/Start testen. Simulator
   ersetzt keinen echten Spaziergang in Fürstenberg.

## Validierung und Grenzen

Inzwischen bestehen **16 Prüfungen** einschließlich wiederholtem App-Build,
Deutschland-GPS, Standortrechten, asynchroner Watch-Absicherung, Lifecycle-
Pause/Fortsetzung, rotierenden Speicher-Snapshots, Import/Wiederherstellung,
lokalen HTML-Abhängigkeiten und Verbindungsanzeige. Capacitor
hat beide nativen Projekte erfolgreich erzeugt. Die vorhandenen Tests sind überwiegend statische
Prüfungen; sie beweisen keine vollständige Gameplay- oder Gerätefunktion.

Noch nicht geprüft: Xcode-/Gradle-Kompilierung, Browser-Visualvergleich, iPhone,
Android-Gerät, Signierung, native GPS-Berechtigungen und Persistenz über
OS-Prozessende. Diese Hülle ist ausdrücklich noch nicht für den GPS-Außentest
freigegeben. Standard-Appicons und Splashscreens müssen vor Verteilung ersetzt
werden. Keine neuen Gameplay-Features wurden ergänzt.

## Technische Quellen

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/getting-started/installation
- https://capacitorjs.com/docs/apis/geolocation
- https://capacitorjs.com/docs/apis/preferences
- https://capacitorjs.com/docs/apis/app

Die aktuellen Capacitor-Unterlagen wurden für Versionswahl und Buildumgebung
abgeglichen. Konkrete Plugin-Konfiguration bei Umsetzung erneut gegen die
gewählte Plugin-Version prüfen.

