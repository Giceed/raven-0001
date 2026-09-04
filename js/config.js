/* ==========================================================
   V2.5 TEST-RESET
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
      devOnly:true
    },

    {
      id:"st_marien",
      type:"exploration",
      name:"St. Marien / Sintfeld-Dom",
      icon:"⛪",
      lat:51.5157079,
      lon:8.7397917
    },

    {
      id:"rathaus",
      type:"exploration",
      name:"Rathaus",
      icon:"🏛️",
      lat:51.5164455,
      lon:8.7449286
    }

  ],

  activityPOIs:[

    {
      id:"beerenstelle_dev",
      type:"activity",
      name:"Beerenstelle",
      icon:"🫐",
      lat:51.51325,
      lon:8.74215
    },

    {
      id:"spielplatz_dev",
      type:"activity",
      name:"Spielplatz",
      icon:"🛝",
      lat:51.51845,
      lon:8.74730
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

