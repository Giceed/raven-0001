# Raven – Entwicklungs-Log

## Aktueller Stand

- Fürstenberg ist das begrenzte Testgebiet.
- Reise- und Erkundungskarte besitzen getrennte Ansichten.
- Der Fog wird aus einer zusammenhängenden, 80 Meter breiten Reisespur geöffnet.
- Autofahrten öffnen die bereiste Karte, aber keine POIs während der Fahrt.
- Punkte pausieren ab 12 km/h und sind über 20 km/h klar gesperrt.
- Nach fünf Sekunden unter 12 km/h werden Punkte wieder freigegeben.
- Vier Bots prüfen Gehen, Joggen, Auto mit Aussteigen und Auto ohne Aussteigen.
- Jeder Bot besitzt einen eigenen Fog und eigenen Fortschritt.
- Raven Studio und Spiel verwenden dieselben POI-Daten.
- Der schwer erreichbare Sportplatz besitzt einen geprüften Außenradius von 120 Metern; normale Aktivitäten bleiben bei 80 Metern.

## Geparkt: echter Außentest

Der Praxistest findet voraussichtlich morgen oder Sonntag statt. Zu prüfen sind GPS-Lücken, Fog-Spur, 60-/80-Meter-Radien, Fahrsperre, Freigabe nach dem Anhalten, Speicherung, Leistung und Akkuverbrauch.

## Automatischer Kompletttest

Bestätigter Lauf mit vier Bots: 4/4 abgeschlossen, 32 öffentliche Wegrouten, 0 Notrouten und 0 Fehler. Mila, Jaro und Kara erreichten jeweils 2/2 Erkundungs- und 6/6 Aktivitätspunkte. Rico deckte seine Fahrstrecke auf, öffnete 0 Punkte und bestätigte 8/8 Fahrsperren. Der schwer erreichbare Sportplatz wurde nach dem ersten Testlauf mit einem sicheren Außenradius von 120 Metern korrigiert und anschließend von allen passenden Bots erreicht.

## Danach

1. Ergebnisse des Außentests auswerten und Kartenmechanik feinjustieren.
2. Aktivitätspunkte mit Items und Abklingzeit ausbauen.
3. Inventargrenze und Erweiterungen entwickeln.
4. Raven als Begleiter mit Hunger, Energie, Stimmung und Fähigkeiten entwickeln.
5. Erste richtige Mission und spielbaren Player View bauen.
6. Weitere Ortsteile erst nach stabilem Fürstenberg-Test ergänzen.

