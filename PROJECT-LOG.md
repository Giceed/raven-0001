# Raven – Entwicklungs-Log

## Aktueller Stand

- Raven V3.0 besitzt einen ersten Spielkreislauf mit einem gespeicherten Begleiter.
- Raven hat Hunger, Energie und Stimmung und kann gefüttert, ausgeruht und beschäftigt werden.
- Das Inventar besitzt 30 Plätze für Futter, Rabenfedern und Glanzsteine.
- Aktivitätspunkte liefern zufällige Items, 10 XP und haben für schnelle Prototyp-Tests 1 Minute Abklingzeit.
- Die Mission „Fürstenberg erwacht“ zeigt den Fortschritt und vergibt 100 XP sowie 3 Futter; bei vollem Inventar bleibt die Item-Belohnung vorgemerkt.
- Die Spieleransicht versteckt God Mode, Bots und Testtechnik. Der Entwickler-Schalter macht diese Werkzeuge wieder erreichbar.
- Der URL-Zusatz `?view=player` sperrt die Spieleransicht vollständig und entfernt auch den Entwickler-Schalter; dieser Link ist für spätere NFC-Tester vorgesehen.
- Spieler- und Entwicklerseite synchronisieren Raven-Werte, Inventar, Mission, XP und Aktivitäts-Cooldowns live über denselben Browser-Speicher; ein Neuladen ist beim Wechsel zwischen offenen Seiten nicht mehr nötig.
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

Zusätzlich besteht die öffentliche Raven-Version den Zehn-Punkte-Grenzfalltest mit 10/10: Geschwindigkeitswechsel, GPS-Sprünge, GPS-Genauigkeit, exakte Radiusgrenzen, Speichern/Neustart, doppelte Aktivierung, Internetausfall, Ortsgrenze, getrennte Bot-Spielstände und Langzeitbegrenzung. Dabei wurde ein falsch Fürstenberg zugeordnetes Rückhaltebecken außerhalb der Ortsgrenze gefunden und durch das Rathaus innerhalb Fürstenbergs ersetzt. Alle acht aktuellen Testpunkte liegen damit in der Fürstenberg-Grenze.

Der zusätzliche Raven-Stresstest besteht 10/10 Fälle: Füttern, Spielen, Erschöpfung, Ausruhen, Wertebegrenzung, volles Inventar, vorgemerkte Missionsbelohnung, 250 Zufallsfunde, 1-Minuten-Cooldown und gesperrter NFC-Spielerlink. Der echte Raven-Spielstand wird nach dem Test vollständig wiederhergestellt.

## Danach

1. Ergebnisse des Außentests auswerten und Kartenmechanik feinjustieren.
2. Aktivitätspunkte mit Items und Abklingzeit ausbauen.
3. Inventargrenze und Erweiterungen entwickeln.
4. Raven als Begleiter mit Hunger, Energie, Stimmung und Fähigkeiten entwickeln.
5. Erste richtige Mission und spielbaren Player View bauen.
6. Weitere Ortsteile erst nach stabilem Fürstenberg-Test ergänzen.

