const CHEM_QUIZ_CONTAINER = {};

(function() {
    // tags for quiz data groups
    //   i.e. "I want to be quizzed on all polyatomic ions" rather than
    //     having to select each charge value individually
    const TAGS = {
        PolyatomicIons: "Polyatomic Ions",
        Acids: "Acids",
    }

    // internal ids to display names of quiz data groups
    const GROUP_NAMES = {
        minus_one_charge_polyatomics: "-1 Charge Polyatomic Ions",
        minus_two_charge_polyatomics: "-2 Charge Polyatmoic Ions",
        minus_three_charge_polyatomics: "-3 Charge Polyatomic Ions",
        plus_one_charge_polyatomics: "+1 Charge Polyatomic Ions",
        strong_acids: "Strong Acids",
        weak_binary_acids: "Weak Binary Acids",
        weak_oxyacids: "Weak Oxyacids"
    }

    // enum(ish) for quiz operation styles
    const QUIZ_TYPE = {
        form2name: "Formula to Name",
        name2form: "Name to Formula",
        random: "Random"
    }

    // helper function to make chem object inline
    function chem(name, formula, charge=0) {
        return {
            name: name,
            formula: formula,
            charge: charge
        }
    }

    // data holder for quiz data
    const QUIZ_DATA = {
        minus_one_charge_polyatomics: {
            tags: ["PolyatomicIons"],
            list: [
                chem("Acetate", "C2H3O2", -1),
                chem("Nitrite", "NO2", -1),
                chem("Nitrate", "NO3", -1),
                chem("Cyanide", "CN", -1),
                chem("Hydroxide", "OH", -1),
                chem("Hypochlorite", "ClO", -1),
                chem("Chlorite", "ClO2", -1),
                chem("Chlorate", "ClO3", -1),
                chem("Perchlorate", "ClO4", -1),
                chem("Permanganate", "MnO4", -1),
                chem("Hydrogen sulfite", "HSO3", -1),
                chem("Hydrogen sulfate", "HSO4", -1),
                chem("Hydrogen carbonate", "HCO3", -1),
                chem("Dihydrogen phosphate", "H2PO4", -1)
            ]
        },
        minus_two_charge_polyatomics: {
            tags: ["PolyatomicIons"],
            list: [
                chem("Sulfite", "SO3", -2),
                chem("Sulfate", "SO4", -2),
                chem("Carbonate", "CO3", -2),
                chem("Silicate", "SiO3", -2),
                chem("Oxalate", "C2O4", -2),
                chem("Peroxide", "O2", -2),
                chem("Chromate", "CrO4", -2),
                chem("Dichromate", "Cr2O7", -2),
                chem("Hydrogen phosphate", "HPO4", -2)
            ]
        },
        minus_three_charge_polyatomics: {
            tags: ["PolyatomicIons"],
            list: [
                chem("Phosphite", "PO3", -3),
                chem("Phosphate", "PO4", -3),
                chem("Arsenate", "AsO4", -3)
            ]
        },
        plus_one_charge_polyatomics: {
            tags: ["PolyatomicIons"],
            list: [
                chem("Ammonium", "NH4", 1),
                chem("Hydronium", "H3O", 1)
            ]
        },
        strong_acids: {
            tags: ["Acids"],
            list: [
                chem("Hydrochloric Acid", "HCl"),
                chem("Hydrobromic Acid", "HBr"),
                chem("Hydroiodic Acid", "HI"),
                chem("Nitric Acid", "HNO3"),
                chem("Sulfuric Acid", "H2SO4"),
                chem("Chloric Acid", "HClO3"),
                chem("Perchloric Acid", "HClO4")
            ]
        },
        weak_binary_acids: {
            tags: ["Acids"],
            list: [
                chem("Hydrosulfuric Acid", "H2S"),
                chem("Hydrofluoric Acid", "HF"),
                chem("Hydrocyanic Acid", "HCN")
            ]
        },
        weak_oxyacids: {
            tags: ["Acids"],
            list: [
                chem("Chlorous Acid", "HClO2"),
                chem("Hypochlorous Acid", "HClO"),
                chem("Carbonic Acid", "H2CO3"),
                chem("Nitrous Acid", "HNO2"),
                chem("Sulfurous Acid", "H2SO3"),
                chem("Phosphoric Acid", "H3PO4"),
                chem("Acetic Acid", "HC2H3O2"),
                chem("Formic Acid", "HCOOH")
            ]
        }
    }

    // the chemical of the current question
    let currentChemical = null
    let correctAnswer = ""
    let correctCharge = 0
    let caseSensitive = false

    // 0 for input name, 1 for input formula
    let currentQuizType = 1

    // treat as a queue of ~5 elements?
    //  used to ensure the same question isn't repeated too soon
    //  (as long as it's possible to not repeat)
    let previousChemicals = []

    // holder for the available chemicals to quiz on
    //   (based on selected groups & tags)
    let quizzableChems = new Set()

    function pickRandom(set) {
        return Array.from(set)[Math.floor(Math.random() * set.size)]
    }

    // updates the current quiz type variable from form info
    function updateCurrentQuizType() {
        let dat = new FormData(document.getElementById("chem-quiz"))

        let qType = dat.get("quiz-type")

        switch (qType) {
            case 'form2name':
                currentQuizType = 0
                break;
            case 'name2form':
                currentQuizType = 1
                break;
            case 'random':
                currentQuizType = Math.floor(Math.random() * 2)
                break;
        }
    }

    let questionDescText = document.getElementById("question-desc")
    let questionChemText = document.getElementById("question-chem")

    let userChargeLabel = document.getElementById("user-charge-label")

    let correctAnswerText = document.getElementById("correct-answer")
    let userAnswerBox = document.getElementById("answer")

    // selects the next question and displays it
    function nextQuestion() {
        correctAnswerText.textContent = ""
        userAnswerBox.value = ""
        checkResultText.setAttribute("hidden", "")

        userChargeLabel.setAttribute("hidden", "")
        userChargeBox.setAttribute("hidden", "")

        if (quizzableChems.size < 1) {
            window.alert("Must have at least one chemical to quiz on")
            return
        }

        if (previousChemicals.length > 5 || previousChemicals.length >= quizzableChems.size) {
            previousChemicals.shift()
        }

        currentChemical = pickRandom(quizzableChems.difference(new Set(previousChemicals)))
        previousChemicals.push(currentChemical)

        updateCurrentQuizType()

        switch (currentQuizType) {
            case 0: // user inputs name
                questionDescText.textContent = "Name the following chemical:"
                questionChemText.textContent = currentChemical.formula
                if (currentChemical.charge != 0) {
                    questionChemText.textContent += ` Charge: ${currentChemical.charge}`
                }
                correctAnswer = currentChemical.name
                caseSensitive = false
                correctCharge = -999999
            break;
            case 1: // user inputs formula
                questionDescText.textContent = "Input the formula of the following chemical:"
                questionChemText.textContent = currentChemical.name
                correctAnswer = currentChemical.formula
                
                if (currentChemical.charge == 0) {
                    correctCharge = -9999999
                } else {
                    correctCharge = currentChemical.charge
                    userChargeLabel.removeAttribute("hidden")
                    userChargeBox.removeAttribute("hidden")
                    userChargeBox.value = 0
                }

                caseSensitive = true
            break;
        }
    }
    CHEM_QUIZ_CONTAINER.nextQuestion = nextQuestion

    let checkResultText = document.getElementById("check-result")

    let userChargeBox = document.getElementById("charge")
    // checks the user's answer and gives feedback
    function checkAnswer() {
        let correct = false

        let userAnswer = userAnswerBox.value.trim()
        let userCharge = parseInt(userChargeBox.value.trim())

        if (caseSensitive) {
            correct = (correctAnswer == userAnswer)
        } else {
            correct = (correctAnswer.toLowerCase() == userAnswer.toLowerCase())
        }

        if (correctCharge > -500) {
            correct = correct && (userCharge == correctCharge)
        }

        if (correct) {
            checkResultText.setAttribute("style", "color: green;")
            checkResultText.textContent = "Correct!"
        } else {
            checkResultText.setAttribute("style", "color: red;")
            checkResultText.textContent = "Incorrect."
        }
        checkResultText.removeAttribute("hidden")
    }
    CHEM_QUIZ_CONTAINER.checkAnswer = checkAnswer

    // shows the answer to the current question
    function showAnswer() {
        correctAnswerText.textContent = correctAnswer
        if (correctCharge > -500) {
            correctAnswerText.textContent += ` Charge: ${correctCharge}`
        }
    }
    CHEM_QUIZ_CONTAINER.showAnswer = showAnswer

    // updates the internal selectors for quiz items, generating
    //   a list of all the valid chemicals to quiz on
    function updateQuizSelections() {
        let dat = new FormData(document.getElementById("chem-quiz"))

        let groups = dat.getAll('chem-group')
        let tags = dat.getAll('chem-tag')
        
        quizzableChems.clear()
        previousChemicals = []

        for (const [key, val] of Object.entries(QUIZ_DATA)) {
            // if we should include elements from this group
            if (groups.includes(key) || tags.some(r => val.tags.includes(r))) {
                for (const chem of Object.values(val.list)) {
                    quizzableChems.add(chem)
                }
            }
        }
    }

    // dropdown handler
    let dropdowns = document.querySelectorAll(".dropdown")
    dropdowns.forEach(e => e.addEventListener("click", event => {
        let toggler = event.target.closest(".dropdown-toggle")

        if (!toggler) {
            return
        }

        let parent = toggler.parentElement
        let pClass = parent.getAttribute("class")
        let children = parent.children

        if ((toggler.getAttribute("class") != "dropdown-toggle" ) && (pClass == "dropdown-open")) {
            return;
        }

        if (pClass == "dropdown") {
            for (let i = 0; i < children.length; i++) {
                if (children[i].getAttribute("class") == "dropdown-toggle") {
                    continue
                }

                children[i].removeAttribute("hidden")
            }

            parent.setAttribute("class", "dropdown-open")
        } else if (pClass == "dropdown-open") {
            for (let i = 0; i < children.length; i++) {
                if (children[i].getAttribute("class") == "dropdown-toggle") {
                    continue
                }
                
                children[i].setAttribute("hidden", "")
            }

            parent.setAttribute("class", "dropdown")
        }
    }))

    // set up tag & chemical set checkboxes
    let chemtagdropdown = document.getElementById("q-tag-div")
    for (const [key, value] of Object.entries(TAGS)) {
        let checkbox = document.createElement("input")
        checkbox.setAttribute("type", "checkbox")
        checkbox.setAttribute("name", "chem-tag")
        checkbox.setAttribute("value", key)
        checkbox.setAttribute("id", key)
        //checkbox.setAttribute("hidden", "")
        checkbox.addEventListener("click", updateQuizSelections)

        let label = document.createElement("label")
        label.setAttribute("for", key)
        //label.setAttribute("hidden", "")
        label.textContent = value

        chemtagdropdown.appendChild(checkbox)
        chemtagdropdown.appendChild(label)

        let br = document.createElement("br")
        //br.setAttribute("hidden", "")

        chemtagdropdown.appendChild(br)
    }

    let chemsetdropdown = document.getElementById("q-set-div")
    for (const [key, value] of Object.entries(GROUP_NAMES)) {
        let checkbox = document.createElement("input")
        checkbox.setAttribute("type", "checkbox")
        checkbox.setAttribute("name", "chem-group")
        checkbox.setAttribute("value", key)
        checkbox.setAttribute("id", key)
        //checkbox.setAttribute("hidden", "")
        checkbox.addEventListener("click", updateQuizSelections)

        let label = document.createElement("label")
        label.setAttribute("for", key)
        //label.setAttribute("hidden", "")
        label.textContent = value

        chemsetdropdown.appendChild(checkbox)
        chemsetdropdown.appendChild(label)

        let br = document.createElement("br")
        //br.setAttribute("hidden", "")

        chemsetdropdown.appendChild(br)
    }

})();