# Raven – Entwicklungs-Log

## Aktueller Stand

- Raven V3.5 begrenzt den passiven Werteverlust bei geschlossener App auf höchstens 24 Stunden. Eine längere Pause bestraft den Spieler nicht mehrfach; der neue Abwesenheitstest erweitert den Raven-Stresstest auf 13/13 Fälle.
- Härtungslauf vom 14. September: 10/10 Karten-Grenzfälle, 12/12 Raven-Stresstests und ein vollständiger 24-Stunden-Straßenlauf bestanden. Spielerzustand blieb nach Neuladen identisch; Entwicklerwerkzeuge waren im NFC-Spielerlink verborgen; Entwickler-, Spieler- und Laborseite meldeten keine Browserfehler.
- Vierzehn zentrale Spieler-Schaltflächen besitzen jetzt mindestens 44 Pixel Höhe für zuverlässige Touch-Bedienung. Der veröffentlichte Handy-Stand wurde nach dem GitHub-Pages-Update erneut vermessen.
- Das Tageslabor nutzt jetzt exakt dieselbe Punkt-Auswahl wie Spiel und Studio, filtert zusätzlich hart gegen die amtliche Fürstenberg-Grenze und lässt zehn Balance-Ravens echte, vom Fußgänger-Router erzeugte Straßenschleifen laufen. POIs werden nur bei einem tatsächlichen Radiuskontakt im Vorbeigehen ausgelöst; ein direktes Abarbeiten von POI zu POI wurde entfernt.
- Auch die vier Hauptbots filtern ihre Ziele gegen die amtliche Fürstenberg-Grenze und zeigen diese auf ihrer Testkarte.
- Raven V3.4 ersetzt das sofortige Ausruhen durch einen gespeicherten Schlafmodus. Je 10 fehlende Energie plant Raven ungefähr eine Minute Schlaf, mindestens eine und höchstens zehn Minuten. Währenddessen sind Füttern, Spielen, Jumper und neuer Erkundungsstart gesperrt; ein Neuladen unterbricht den Countdown nicht.
- Raven V3.3 gibt allen vier digitalen Testern einen getrennten Test-Raven mit Hunger, Energie, Stimmung und eigenem Inventar. Bewegung, Erkundungsfunde, Aktivitätsbelohnungen und automatisches Füttern werden im Bot-Protokoll geprüft.
- Der Zeitverbrauch wurde im echten Ein-Minuten-Zeitraffer erfolgreich getestet und anschließend wieder auf Stundenbetrieb gestellt.
- Eine neue Erkundung kann bei weniger als 10 Hunger oder 10 Energie nicht begonnen werden; laufende Touren werden nicht hart abgebrochen.
- Raven Jumper besitzt Touch-, Maus- und Tastatursteuerung, Punkte je Landung sowie einen gespeicherten Highscore auch bei manuellem Beenden oder Schließen.
- Raven V3.1 ergänzt den vollständigen Begleiter-Rohbau vor dem späteren Balancing-Cut.
- Neue NFC-Spieler erhalten ein kurzes Start-Tutorial und können ihren Raven benennen.
- Beeren, Futter und Lieblingsfutter sättigen unterschiedlich; Energiekörner stellen Energie her. Federn und Glanzsteine bleiben vorerst seltene Platzhalter.
- Brunnen, Spielplätze, Sportplätze und sonstige Aktivitäten besitzen unterschiedliche Fundtabellen.
- Raven reagiert sichtbar auf Glück, Hunger, Erschöpfung und schlechte Werte.
- Stimmung wird durch Hunger und Energie begrenzt; volle Laune kann einen hungrigen Raven nicht mehr überdecken.
- Echte Bewegung kostet nach jeweils 250 Metern Hunger und Energie. Zusätzlich sinken Werte langsam über reale Zeit.
- Drei tägliche Aufgaben prüfen Füttern, Spielen und das Sammeln an einem Aktivitätspunkt; Abschluss gibt Lieblingsfutter und 20 XP.
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

1. Den korrigierten 24-Stunden-Straßenlauf im Tageslabor erneut ausführen und die zehn Raven-Profile vergleichen.
2. Finn/Hugo und die übrigen Balance-Profile auswerten und einen ersten offiziellen Hunger-/Energie-Vorschlag festlegen.
3. Rathaus als ersten wöchentlichen Minispiel-Ort mit Raven-Jumper-Highscore testen.
4. Ergebnisse des echten GPS-Außentests auswerten und Kartenmechanik feinjustieren.
5. Inventargrenze, Federn, Glanzsteine und Raven-Entwicklung definieren.
6. Weitere Ortsteile erst nach stabilem Fürstenberg-Test ergänzen.

