const HLIST_CODE_CONTAINER = {};

(function() {
const DEBUG = false

// objects representing each player indexed by player id (index in hlist)
let players = [];

// this just makes debugging easier
if (DEBUG) {
    HLIST_CODE_CONTAINER.players = players
}

// only used in manual mode; this is the API key entered by the user to make a direct google sheets api request from their browser
// typical usage just grabs from a github gist that does not require an api key
let apikey = "";

// TODO: dynamic sizing
const VALUES_FOR_CLEAR = [ // points earned by stars in level
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
];

// array used to keep track of which tier indices have completed maps
//   i.e. if a 1 star map has been cleared at all, this will contain the number 0
let clearedTierIndices = []

// constant references to html elements to be updated
const PLAYER_RANK_TABLE = document.getElementById("rank-table");
const SCORE_FORM = document.getElementById("score-per-difficulty");

// is there a base function that does this? maybe
// but i can't find it so trol
function makeEmptyArray() {
    let arr = [];
    for (let i = 0; i < 20; i++) {
        arr.push(0);
    }
    return arr;
}

const SHEET_ID = "1A88F3X2lOQJry-Da2NpnAr-w5WDrkjDtg7Wt0kLCiz8";

// full data handling function for manual API key mode:
//  gets the data from google sheets
//  processes the data
//  displays the data
// returns nothing
function getData() {
    // there's the pesky magic number! multiply it by 10 and move on smile
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?key=${apikey}&ranges=Clears!E1:1&ranges=Clears!2:3000`)
        .then((response) => response.json())
        .then((data) => {
            processData(data);
        })
        .catch((error) => console.error("Error fetching player data:", error))
        .finally(() => {
            displayData();
        });
}

// parses raw google sheets data into information
// takes the google sheets data as a string input
// returns nothing
// modifies global variable players adding player names, scores, and clears
// modifies global variable STARS_CLEARED by setting indices to true if a map of the tier has been cleared (which is used in display code)
function processData(data) {
    // construct the player objects
    players = [];
    let playerNames = data.valueRanges[0].values[0];
    for (let i = 0; i < playerNames.length; i++) {
        players.push(
            {
                name: playerNames[i],
                id: i,
                score: 0,
                clearsPerTier: makeEmptyArray(),
                clearedMaps: []
            }
        )
    }

    // set cleared stars to be empty in case circumstances change
    cleared_stars = []

    let unprocessedClears = data.valueRanges[1].values;

    let tierIndex = -1; // iterate the list from bottom to top so that the tier numbers can be done sequentially
    // this is helpful because the tier names aren't actually returned by the sheets api with how they're done, so there's no way to count stars or anything
    // the list has an empty row at the bottom before the first tier, so we start at -1
    // also 1 star is tierIndex==0, etc.
    for (let i = unprocessedClears.length - 1; i >= 0; i--) {
        if (unprocessedClears[i].length <= 1) { // each tier is NOW deliminated by a 1 length row containing an integer
            // TODO: this should really be fixed to parse said integer but...
            tierIndex += 1; // move to the next tier
        } else if (unprocessedClears[i][0].startsWith("\u2B50") || unprocessedClears[i][0] == '') { // skip tier header rows without any processing
            continue;
        } else { // attempt to process the row as a map
            if (parseInt(unprocessedClears[i][1]) < 1) { // move on to the next row if nobody's cleared the map (this is the total clear column)
                if (DEBUG) {
                    console.log("removing (no clears): " + unprocessedClears[i][0])
                }
                continue;
            } else if (tierIndex < 0) { // if we think we find a map before 1 star, just move on
                if (DEBUG) {
                    console.log("broken tier!!!")
                }
                continue;
            }

            // we're decently sure that the row we're working with is actually a map and somebody's cleared it now
            
            // add the tier index of the map to the cleared indices array, if not already there
            if (!clearedTierIndices.includes(tierIndex)) {
                clearedTierIndices.push(tierIndex)
            }

            // iterate the map row to find each player who cleared it
            for (let j = 4; j <= unprocessedClears[i].length; j++) { // start at 4 to skip the first 4 columns (name, total clears, FCs, video link)
                if (unprocessedClears[i][j] != "" && (j - 4) < players.length) {
                    // relevant player ids are the same as the element indices -4 by design
                    players[j - 4].score += VALUES_FOR_CLEAR[tierIndex]; // add the score to the player
                    players[j - 4].clearsPerTier[tierIndex] += 1;
                    if (DEBUG && isNaN(players[j-4].score)) {
                        console.log("AHHHHHHHH")
                        console.log(players[j-4])
                    } 
                }
            }
        }
    }
}

//------------------- graph setup code ------------------
const PLAYER_LABELS = [];
const PLAYER_SCORES = [];

if (DEBUG) {
    HLIST_CODE_CONTAINER.graphLabels = PLAYER_LABELS
    HLIST_CODE_CONTAINER.graphScores = PLAYER_SCORES
}

const DATA_CHART = new Chart("data-graph", {
    type: "bar",
    data: {
        labels: PLAYER_LABELS,
        datasets: [{
            backgroundColor: "blue",
            data: PLAYER_SCORES
        }]
    },
    options: {
        plugins: {
            legend: {display: false},
            title: {
                display: true,
                text: "Top 10 Players (ties broken alphabetically)"
            },
            subtitle: {
                display: true,
                text: "Created with Chart.js",
                position: "bottom"
            }
        }
    }
})
//---------------- end graph setup code ----------------

// constructs the HTML table and updates the graph based on data contained in global variables
//   specifically 'players' and 'STARS_CLEARED'
// returns nothing
function displayData() {
    // *** part 1: create a new list of the players and sort it by score for display
    let sortedPlayerRanking = [];

    for (let i = 0; i < players.length; i++) {
        sortedPlayerRanking.push(players[i])
    }

    sortedPlayerRanking.sort((a, b) => {
        let scoreDif = b.score - a.score
        if (scoreDif != 0) {
            return scoreDif
        } else {
            return a.name.localeCompare(b.name)
        }
    }); // sort by score, then name

    // *** part 2: create the html table header
    let headStart = `<thead><tr><th>rank</th><th>score</th><th class="sorttable_alpha">name</th>`
    let headEnd = `</tr></thead>`

    let headInside = ""

    // we want to display tiers in the reverse order they're discovered
    //  since we discover them small -> large and want the highest tiers to be displayed first
    let displayedTiers = clearedTierIndices.toReversed()

    // for each displayed tier, create a header with that many stars
    for (let i = 0; i < displayedTiers.length; i++) {
        headInside += "<th>"
        for (let j = 0; j <= displayedTiers[i]; j++) {
            headInside += "&#11088;"
        }
        headInside += "</th>"
    }

    // replace the current table with the header of the new table
    PLAYER_RANK_TABLE.innerHTML = headStart + headInside + headEnd

    // *** part 3: create the html table body and update the graph
    let tBody = document.createElement('tbody')
    PLAYER_RANK_TABLE.appendChild(tBody)

    // clear the arrays used for the graph
    //  i'm sure there's better ways to do this but my one and only attempt broke everything
    //   so we can iteratively pop a little
    let listLen = PLAYER_LABELS.length
    for (let i = 0; i < listLen; i++) {
        PLAYER_LABELS.pop();
        PLAYER_SCORES.pop();
    }
    
    // add each player to the table one by one, in descending score order
    for (let i = 0; i < sortedPlayerRanking.length; i++) {
        let player = sortedPlayerRanking[i];

        // don't include players without score in the table
        if (player.score <= 0) {
            continue
        }

        // the first (up to) 10 players go into the graph
        if (PLAYER_LABELS.length < 10) {
            PLAYER_LABELS.push(player.name);
            PLAYER_SCORES.push(player.score);
        }

        // create and populate the table row for the player
        let playerRow = document.createElement("tr");

        playerRow.innerHTML = `<td>${i + 1}</td><td>${player.score}</td><td>${player.name}</td>`;
        for (let j = 0; j < displayedTiers.length; j++) {
            playerRow.innerHTML += `<td>${player.clearsPerTier[displayedTiers[j]]}</td>`;
        }

        tBody.appendChild(playerRow);
    }

    // update the graph, now that new labels and scores are assigned to it
    try {
        DATA_CHART.update();
    } catch {
        console.log("error updating the graph")
    }

    // *** part 4: update the score per tier form to account for all displayed tiers
    // wipe the form
    SCORE_FORM.innerHTML = ""

    // iterate over the tiers with completions and make an input for each one
    for (let i = 0; i < clearedTierIndices.length; i++) {
        let iTier = clearedTierIndices[i] // internal tier (tier index)
        let oTier = iTier + 1  // outward-facing tier (star count)
        SCORE_FORM.innerHTML += `<label for="${oTier}-star">${oTier} star</label>
                <input type="number" id="${oTier}-star" name="${iTier}" value="${VALUES_FOR_CLEAR[iTier]}">
                <br>`
    }

    // make the table sortable ig
    sorttable.makeSortable(PLAYER_RANK_TABLE)
    //console.log(sortedPlayerRanking);
}

// takes the numbers entered into the score per clear form and uses them to rescore all players and adjust the displayed data
// returns nothing
function updateScoring() {
    let formData = new FormData(SCORE_FORM);

    // parse form to redo clear vlaues
    for (var pair of formData.entries()) {
        let value = parseFloat(pair[1]);
        if (isNaN(value)) {
            alert("Please enter a valid number for all scores.");
            return;
        }
        //console.log(pair[0], value);
        VALUES_FOR_CLEAR[parseInt(pair[0])] = value;
    }

    // recalculate every player's score
    for (let i = 0; i < players.length; i++) {
        let player = players[i];
        player.score = 0;
        for (let j = 0; j < player.clearsPerTier.length && j < VALUES_FOR_CLEAR.length; j++) {
            player.score += player.clearsPerTier[j] * VALUES_FOR_CLEAR[j];
        }
    }

    // redo the data display
    displayData();
}
HLIST_CODE_CONTAINER.updateScoring = updateScoring;

// used only in manual API key mode
// gets the apikey from the html entry box and then uses it to retrieve, process, and display data straight from google sheets
// returns nothing
function setApiKeyAndGetData() {
    apikey = document.getElementById("googleApiKey").value;

    getData();
}
HLIST_CODE_CONTAINER.setApiKeyAndGetData = setApiKeyAndGetData;

var gistLink = "https://gist.githubusercontent.com/Kelton555/97017c745a85a29597692c9ddd74a8be/raw/hlist%20data";

// generally used instead of any API key function
// grabs the data from the github gist (no API key required), processes, and displays it
// returns nothing
function loadGist() {
    fetch(gistLink)
    .then((response) => response.json())
    .then((data) => {
        document.getElementById("lastGistUpdate").innerText = `${data["iso-time"]}`;
        processData(data);  
    })
    .catch((error) => console.error("Error fetching player data:", error))
    .finally(() => {
        displayData();
    })
}
HLIST_CODE_CONTAINER.loadGist = loadGist;

var apiKeyOn = false;

// function used to toggle between usage modes (API key and github gist mode)
function toggleApiKeyUsage() {
    if (apiKeyOn) {
        document.getElementById("api-key-container").style.display = "none";
        document.getElementById("gist-load-container").style.display = "inherit";
    } else {
        document.getElementById("api-key-container").style.display = "inherit";
        document.getElementById("gist-load-container").style.display = "none";
    }
    apiKeyOn = !apiKeyOn;
}
HLIST_CODE_CONTAINER.toggleApiKeyUsage = toggleApiKeyUsage;

})();
