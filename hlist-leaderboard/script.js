const HLIST_CODE_CONTAINER = {};

(function() {

let players = [];
let clears = [];


let apikey = "";

const VALUES_FOR_CLEAR = [ // points earned per star in level
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

const TIER_NAMES = [
    "One Star",
    "Two Star",
    "Three Star",
    "Four Star",
    "Five Star",
    "Six Star",
    "Seven Star",
    "Eight Star",
    "Nine Star",
    "Ten Star",
];

/**
 *  "Low Two Star",
    "High Two Star",
    "Low Three Star",
    "High Three Star",
    "Low Four Star", // this one doesn't exist but it helps with programming
    "Four Star",
    "Low Five Star",
    "High Five Star",
    "Low Six Star",
    "High Six Star",
    "Low Seven Star",
    "High Seven Star",
    "Low Eight Star",
    "High Eight Star",
    "Low Nine Star",
    "High Nine Star",
    "Low Ten Star",
    "High Ten Star",
    "Low Eleven Star",
    "High Eleven Star",
    "Low Twelve Star",
    "High Twelve Star",
 */

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
function getData() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchGet?key=${apikey}&ranges=Clears!E1:1&ranges=Clears!2:300`)
        .then((response) => response.json())
        .then((data) => {
            processData(data);
        })
        .catch((error) => console.error("Error fetching player data:", error))
        .finally(() => {
            displayData();
        });
}

function processData(data) {
    players = data.valueRanges[0].values[0];
    let unprocessedClears = data.valueRanges[1].values;

    //console.log(data);

    clears = [];

    for (let i = 0; i < players.length; i++) {
        clears.push({
            score: 0,
            clearsPerTier: makeEmptyArray() // this is stupid
        });
    }

    let tierIndex = -1;
    for (let i = unprocessedClears.length - 1; i >= 0; i--) {
        if (unprocessedClears[i].length == 0) { // if the row is empty
            tierIndex += 1; // up a tier
        } else if (unprocessedClears[i][0].startsWith("\u2B50") || unprocessedClears[i][0] == '') {
            continue;
        } else {
            if (tierIndex > 6) {
                break; // you silly little pranksters giving two people clears on 1 octillion lava neutrals, now i have to bring jank into the world
            }
            for (let j = 4; j < unprocessedClears[i].length; j++) { // start at 4 to skip the first 4 columns
                if (unprocessedClears[i][j] != "" && (j - 4) < players.length) {
                    clears[j - 4].score += VALUES_FOR_CLEAR[tierIndex]; // add the score to the player
                    clears[j - 4].clearsPerTier[tierIndex] += 1;
                }
            }
        }
    }
}

const DISPLAYED_TIERS = [0, 1, 2, 3, 4, 5, 6].reverse();

const PLAYER_LABELS = [];
const PLAYER_SCORES = [];

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

function displayData() {
    let sortedPlayerRanking = [];

    for (let i = 0; i < players.length; i++) {
        sortedPlayerRanking.push({
            id: i,
            score: clears[i].score
        })
    }

    sortedPlayerRanking.sort((a, b) => b.score - a.score); // sort by score

    PLAYER_RANK_TABLE.innerHTML = "<tr><th>rank</th><th>score</th><th>name</th><th>&#11088;&#11088;&#11088;&#11088;&#11088;&#11088;&#11088;</th><th>&#11088;&#11088;&#11088;&#11088;&#11088;&#11088;</th><th>&#11088;&#11088;&#11088;&#11088;&#11088;</th><th>&#11088;&#11088;&#11088;&#11088;</th><th>&#11088;&#11088;&#11088;</th><th>&#11088;&#11088;</th><th>&#11088;</th></tr>";

    for (let i = 0; i < 10; i++) {
        PLAYER_LABELS.pop();
        PLAYER_SCORES.pop();
    }

    for (let i = 0; i < sortedPlayerRanking.length; i++) {
        let player = sortedPlayerRanking[i];

        if (i < 10) {
            PLAYER_LABELS.push(players[player.id]);
            PLAYER_SCORES.push(player.score);
        }

        if (player.score <= 0) {
            continue
        }

        let playerRow = document.createElement("tr");

        playerRow.innerHTML = `<td>${i + 1}</td><td>${player.score}</td><td>${players[player.id]}</td>`;
        for (let j = 0; j < DISPLAYED_TIERS.length; j++) {
            playerRow.innerHTML += `<td>${clears[player.id].clearsPerTier[DISPLAYED_TIERS[j]]}</td>`;
        }
        PLAYER_RANK_TABLE.appendChild(playerRow);
    }

    DATA_CHART.update();

    //console.log(sortedPlayerRanking);
}

function updateScoring() {
    let formData = new FormData(SCORE_FORM);

    for (var pair of formData.entries()) {
        let value = parseInt(pair[1]);
        if (isNaN(value)) {
            alert("Please enter a valid number for all scores.");
            return;
        }
        //console.log(pair[0], value);
        VALUES_FOR_CLEAR[parseInt(pair[0])] = value;
    }

    for (let i = 0; i < players.length; i++) {
        clears[i].score = 0;
        for (let j = 0; j < clears[i].clearsPerTier.length && j < VALUES_FOR_CLEAR.length; j++) {
            clears[i].score += clears[i].clearsPerTier[j] * VALUES_FOR_CLEAR[j];
        }
    }

    displayData();
}
HLIST_CODE_CONTAINER.updateScoring = updateScoring;

function setApiKeyAndGetData() {
    apikey = document.getElementById("googleApiKey").value;

    getData();
}
HLIST_CODE_CONTAINER.setApiKeyAndGetData = setApiKeyAndGetData;

var gistLink = "https://gist.githubusercontent.com/Kelton555/97017c745a85a29597692c9ddd74a8be/raw/hlist%20data";
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
