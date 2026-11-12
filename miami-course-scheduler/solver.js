runASP = null;

// returns an array of available terms
// example term object:
// {
//  displayTerm: true,
//  endDate: "2026-12-11",
//  name: "Fall Semester 2026-27",
//  startDate: "2026-08-24",
//  termId: "202710"
// }
getTerms = null;

(function() {
    let CLINGO = null;
    import("https://cdn.jsdelivr.net/npm/clingo-wasm@0.6.0/dist/index.web.min.js").then(mod => {
        CLINGO = mod
    })

    let COURSE_DATA = null;
    function _loadCourseData() {
        fetch("https://gist.githubusercontent.com/Kelton555/33fa8c196208de8482dee3620bcd1d61/raw").then((response) => {
            response.json().then((data) => {
                COURSE_DATA = data
                console.log(data)
            })
        })
    }
    _loadCourseData()

    const BASE_PROGRAM = `
        % Generate possible schedules
        {taking(X): section(T, X)} = 1 :- must(T).
        {taking(X): section(T, X)} <= 1 :- not must(T), class(T, _).

        % Restrict credit hours
        credit_hours(N) :- N=#sum{HRS, X: taking(X), section(T, X), class(T, HRS)}.

        % cannot have more than 20
        :- credit_hours(N), N > 20.

        % want to take more credit hours up to 18
        :~ credit_hours(N), N<18. [18-N@10]

        % two taken classes cannot overlap
        %   class X cannot end after Y starts while starting before Y ends
        :- taking(X), taking(Y), X!=Y, schedule(X, XSTART, XEND, D), schedule(Y, YSTART, YEND, D), YSTART<XEND, XSTART<YEND.

        validTime(0..1440).
    `

    async function _getTerms() {
        while (COURSE_DATA == null) {
            await new Promise(r => setTimeout(r, 250))
        }
        const returnTerms = []

        for (const key in COURSE_DATA['terms']) {
            returnTerms.push(COURSE_DATA['terms'][key]['term'])
        }

        return returnTerms
    }
    getTerms = _getTerms

    async function _runASP(str, args=[]) {
        return await CLINGO.run(str, 0, args);
    }
    runASP = _runASP
})()
