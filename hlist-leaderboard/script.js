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
    "Low One Star",
    "High One Star",
    "Low Two Star",
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
];

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

    clears = [];

    for (let i = 0; i < players.length; i++) {
        clears.push({
            score: 0,
            clearsPerTier: makeEmptyArray() // this is stupid
        });
    }

    let tierIndex = 0;
    for (let i = 0; i < unprocessedClears.length; i++) {
        if (unprocessedClears[i].length == 0) { // if the row is empty
            tierIndex -= 1; // go to the low version of the tier
        } else if (unprocessedClears[i][0].startsWith("\u2B50")) {
            tierIndex = (unprocessedClears[i][0].match(/\u2B50/g) || []).length * 2 - 1; // count the number of stars and multiply by 2 to get the index, then subtract 1 to get the correct index
            // copilot wrote that comment sorry
        } else {
            for (let j = 4; j < unprocessedClears[i].length; j++) { // start at 4 to skip the first 4 columns
                if (unprocessedClears[i][j] != "" && (j - 4) < players.length) {
                    clears[j - 4].score += VALUES_FOR_CLEAR[tierIndex]; // add the score to the player
                    clears[j - 4].clearsPerTier[tierIndex] += 1;
                }
            }
        }
    }
}

const DISPLAYED_TIERS = [0, 1, 2, 3, 4, 5, 7].reverse();

function displayData() {
    let sortedPlayerRanking = [];

    for (let i = 0; i < players.length; i++) {
        sortedPlayerRanking.push({
            id: i,
            score: clears[i].score
        })
    }

    sortedPlayerRanking.sort((a, b) => b.score - a.score); // sort by score

    PLAYER_RANK_TABLE.innerHTML = "<tr><th>rank</th><th>score</th><th>name</th><th>&#11088;&#11088;&#11088;&#11088;</th><th>High &#11088;&#11088;&#11088;</th><th>Low &#11088;&#11088;&#11088;</th><th>High &#11088;&#11088;</th><th>Low &#11088;&#11088;</th><th>High &#11088;</th><th>Low &#11088;</th></tr>";

    for (let i = 0; i < sortedPlayerRanking.length; i++) {
        let player = sortedPlayerRanking[i];

        if (player.score == 0) {
            continue
        }

        let playerRow = document.createElement("tr");

        playerRow.innerHTML = `<td>${i + 1}</td><td>${player.score}</td><td>${players[player.id]}</td>`;
        for (let j = 0; j < DISPLAYED_TIERS.length; j++) {
            playerRow.innerHTML += `<td>${clears[player.id].clearsPerTier[DISPLAYED_TIERS[j]]}</td>`;
        }
        PLAYER_RANK_TABLE.appendChild(playerRow);
    }

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

function setApiKeyAndGetData() {
    apikey = document.getElementById("googleApiKey").value;

    getData();
}

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
