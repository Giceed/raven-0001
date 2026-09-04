/* ==========================================================
   V2.6 TESTSTAND
   - Fürstenberg ist als aktueller Standort und Reiseeintrag bekannt.
   - 2 Erkundungspunkte + 2 Aktivitäten sind für schnelle Tests
     bereits freigeschaltet.
   ========================================================== */

if (!localStorage.getItem("ravenV25DistrictResetDone")) {

  localStorage.removeItem("ravenExploredPoints");
  localStorage.removeItem("ravenTravelHistory");
  localStorage.removeItem("ravenDiscoveredPlaces");
  localStorage.removeItem("ravenFuerstenbergMission");

  localStorage.setItem(
    "ravenDiscoveredPlaces",
    JSON.stringify([{
      name:"Fürstenberg",
      district:"Fürstenberg",
      municipality:"Bad Wünnenberg",
      region:"Nordrhein-Westfalen",
      country:"Deutschland",
      discoveredAt:Date.now()
    }])
  );

  localStorage.setItem(
    "ravenFuerstenbergMission",
    JSON.stringify({
      visitedPOIs:["schloss","st_marien"],
      visitedActivities:["beerenstelle_dev","spielplatz_dev"],
      completed:false
    })
  );

  localStorage.setItem("ravenMapMode","explore");
  localStorage.setItem("ravenV25DistrictResetDone","1");
}

/* V2.6: Einen Pflichtpunkt für Radius- und God-Mode-Tests offenhalten. */
if (!localStorage.getItem("ravenV26RadiusTestResetDone")) {
  const mission = JSON.parse(
    localStorage.getItem("ravenFuerstenbergMission") || "{}"
  );

  mission.visitedPOIs = (mission.visitedPOIs || [])
    .filter(id => id !== "rathaus");
  mission.visitedActivities = mission.visitedActivities || [];
  mission.completed = false;

  localStorage.setItem(
    "ravenFuerstenbergMission",
    JSON.stringify(mission)
  );
  localStorage.setItem("ravenV26RadiusTestResetDone","1");
}

/* Zweiter V2.6-Testreset: Schloss und Rathaus bleiben offen. */
if (!localStorage.getItem("ravenV26RadiusTestReset2Done")) {
  const mission = JSON.parse(
    localStorage.getItem("ravenFuerstenbergMission") || "{}"
  );

  mission.visitedPOIs = (mission.visitedPOIs || [])
    .filter(id => id !== "schloss" && id !== "rathaus");
  mission.completed = false;

  localStorage.setItem(
    "ravenFuerstenbergMission",
    JSON.stringify(mission)
  );
  localStorage.setItem("ravenV26RadiusTestReset2Done","1");
}

/* V2.6 r4: Teststand auch in getrennten Browser-Speichern herstellen. */
if (!localStorage.getItem("ravenV26RadiusTestR4Done")) {
  const mission = JSON.parse(
    localStorage.getItem("ravenFuerstenbergMission") || "{}"
  );

  mission.visitedPOIs = ["st_marien"];
  mission.visitedActivities = mission.visitedActivities || [];
  mission.completed = false;

  localStorage.setItem(
    "ravenFuerstenbergMission",
    JSON.stringify(mission)
  );
  localStorage.setItem("ravenV26RadiusTestR4Done","1");
}

/* ==========================================================
   TESTGEBIET
   Ganz Deutschland bleibt auf der Karte erreichbar. Für die
   erste Testphase werden Orte im 100-km-Kreis um Fürstenberg
   automatisch erkannt und mit ihrer OSM-Ortsgrenze versehen.
   ========================================================== */

const TEST_REGION = {
  name:"100 km um Fürstenberg",
  centerLat:51.5157,
  centerLon:8.741,
  radiusMeters:100000,
  countryCode:"de"
};

/* ==========================================================
   FÜRSTENBERG
   ========================================================== */

const FUERSTENBERG = {

  boundaryObjectId:"DE052926",

  visitRadius:60,

  poiXP:25,
  activityXP:10,
  completionXP:100,

  explorationPOIs:[

    {
      id:"schloss",
      type:"exploration",
      name:"Schloss Fürstenberg",
      icon:"🏰",
      lat:51.5155802,
      lon:8.7367807,
      discoveryRadius:160,
      access:"view_only",
      accessHint:"Betreten nicht erforderlich – die Nähe auf öffentlichen Wegen reicht.",
      devOnly:true
    },

    {
      id:"st_marien",
      type:"exploration",
      name:"St. Marien / Sintfeld-Dom",
      icon:"⛪",
      lat:51.5157079,
      lon:8.7397917,
      discoveryRadius:50,
      access:"public_surroundings",
      accessHint:"Vom öffentlichen Umfeld der Kirche aus entdeckbar."
    },

    {
      id:"rathaus",
      type:"exploration",
      name:"Rathaus",
      icon:"🏛️",
      lat:51.5164455,
      lon:8.7449286,
      discoveryRadius:50,
      access:"public_surroundings",
      accessHint:"Vom öffentlichen Straßenraum aus entdeckbar."
    }

  ],

  activityPOIs:[

    {
      id:"beerenstelle_dev",
      type:"activity",
      name:"Beerenstelle",
      icon:"🫐",
      lat:51.514164328059515,
      lon:8.741700053215029,
      discoveryRadius:35,
      access:"outdoor"
    },

    {
      id:"spielplatz_dev",
      type:"activity",
      name:"Spielplatz",
      icon:"🛝",
      lat:51.51308183260237,
      lon:8.745600332095771,
      discoveryRadius:35,
      access:"outdoor"
    }

  ]

};

const ALL_POINTS = [
  ...FUERSTENBERG.explorationPOIs,
  ...FUERSTENBERG.activityPOIs
];

let fuerstenbergMission =
  JSON.parse(localStorage.getItem("ravenFuerstenbergMission")) || {
    visitedPOIs:[],
    visitedActivities:[],
    completed:false
  };

fuerstenbergMission.visitedPOIs =
  (fuerstenbergMission.visitedPOIs || []).filter(id =>
    FUERSTENBERG.explorationPOIs.some(p => p.id === id)
  );

fuerstenbergMission.visitedActivities =
  (fuerstenbergMission.visitedActivities || []).filter(id =>
    FUERSTENBERG.activityPOIs.some(p => p.id === id)
  );

if (
  FUERSTENBERG.explorationPOIs.every(p =>
    fuerstenbergMission.visitedPOIs.includes(p.id)
  )
) {
  fuerstenbergMission.completed = true;
}

