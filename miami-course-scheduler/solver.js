// (async function)
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

// (async function)
// returns an array of perspective areas
// example perspective area object:
// {
//  code: "PA4b",
//  name: "PA- Intercult'l Consciousness"
// }
getPerspectiveAreas = null;

// (async function)
// returns an array of campuses
// example campus object:
// {
//  code: "O",
//  name: "Oxford"
// }
getCampuses = null;

// (async function)
// returns an array of schedules
// schedules consist of a list of CRNs
runASPScheduler = null;

class TimeWrapper {
    #time = 0;

    constructor(time) {
        if (typeof (time) == "string" && time.includes(":")) {
            // we've got a regular old string time
            const PARTS = time.split(":")
            this.#time = parseInt(PARTS[0]) * 60
            this.#time += parseInt(PARTS[1])
        } else if (typeof (time) == "number") {
            this.#time = Math.floor(time)
        }
        this.#normalizeTime()
    }

    #normalizeTime() {
        this.#time = this.#time % (24 * 60)
    }

    getASPTime() {
        return this.#time
    }

    get24Time() {
        return `${Math.floor(this.#time / 60)}:${this.#time % 60}${this.#time % 60 < 10 ? "0" : ""}`
    }

    get12Time() {
        return `${((Math.floor(this.#time / 60) + 11) % 12) + 1}:${this.#time % 60}${this.#time % 60 < 10 ? "0" : ""} ${this.#time >= (60 * 12) ? "PM" : "AM"}`
    }

    toString() {
        return this.get12Time()
    }
}

(function () {
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
        % PREDICATE DOCUMENTATION
        % taking(CRN)
        % section(COURSE, CRN)
        % instructor(CRN, INSTRUCTOR)
        %  > note that one CRN may have multiple (or no) instructors
        % schedule(CRN, START_TIME, END_TIME, DAY)
        % course(COURSE, CREDIT_HOURS)

        % INPUT PREDICATE DOCUMENTATION
        % must_course(COURSE) - must take a course
        % max_hours(HRS)
        % min_hours(HRS)

        % Generate possible schedules
        {taking(X): section(T, X)} = 1 :- must_course(T).
        {taking(X): section(T, X)} <= 1 :- not must_course(T), course(T, _).

        % Restrict credit hours
        credit_hours(N) :- N=#sum{HRS, X: taking(X), section(T, X), course(T, HRS)}.

        % cannot have more than max credit hours
        :- credit_hours(N), max_hours(M), N > M.

        % cannot have less than min credit hours
        :- credit_hours(N), min_hours(M), N < M.

        % want to take more credit hours up to 18
        % :~ credit_hours(N), N<18. [18-N@10]

        % two taken classes cannot overlap
        %   class X cannot end after Y starts while starting before Y ends
        :- taking(X), taking(Y), X!=Y, schedule(X, XSTART, XEND, D), schedule(Y, YSTART, YEND, D), YSTART<XEND, XSTART<YEND.

        % helpers for start/end time per day
        start_time(DAY, TIME) :- TIME=#min{ST, X: taking(X), schedule(X, ST, _, DAY)}, validTime(TIME), schedule(_, _, _, DAY).
        end_time(DAY, TIME) :- TIME=#max{ET, X: taking(X), schedule(X, _, ET, DAY)}, validTime(TIME), schedule(_, _, _, DAY).

        weekday(monday). weekday(tuesday). weekday(wednesday). weekday(thursday). weekday(friday).
        validTime(0..1440).
    `

    function _forEachCourse(toCall) {
        for (const key in COURSE_DATA['terms']) {
            let term = COURSE_DATA['terms'][key]
            if ('courses' in term && typeof (term['courses']) == typeof ([])) {
                term['courses'].forEach(course => {
                    toCall(course)
                });
            }
        }
    }

    async function _waitForData() {
        while (COURSE_DATA == null) {
            await new Promise(r => setTimeout(r, 250))
        }
    }

    async function _getTerms() {
        await _waitForData()
        const returnTerms = []

        for (const key in COURSE_DATA['terms']) {
            returnTerms.push(COURSE_DATA['terms'][key]['term'])
        }

        return returnTerms
    }
    getTerms = _getTerms

    const ATTRIBUTE_SET = new Set()
    const ATTRIBUTE_DICT = {}
    async function _getPerspectiveAreas() {
        if (ATTRIBUTE_SET.size == 0) {
            await _waitForData()
            _forEachCourse((course) => {
                if ("attributes" in course && typeof (course["attributes"]) == typeof ([])) {
                    course['attributes'].forEach(attribute => {
                        if (!ATTRIBUTE_SET.has(attribute['code'])) {
                            ATTRIBUTE_SET.add(attribute['code'])
                            ATTRIBUTE_DICT[attribute['code']] = attribute['description']
                        }
                    })
                }
            })
        }

        const returnArray = []
        ATTRIBUTE_SET.forEach(code => {
            if (code.startsWith("PA") || code.startsWith("SI")) {
                returnArray.push({
                    "code": code,
                    "name": ATTRIBUTE_DICT[code].trim()
                })
            }
        })
        return returnArray
    }
    getPerspectiveAreas = _getPerspectiveAreas

    const CAMPUS_SET = new Set()
    const CAMPUS_DICT = {}
    async function _getCampuses() {
        if (CAMPUS_SET.size == 0) {
            await _waitForData()
            _forEachCourse((course) => {
                if ("campusCode" in course && "campusName" in course) {
                    if (!CAMPUS_SET.has(course["campusCode"])) {
                        CAMPUS_SET.add(course['campusCode'])
                        CAMPUS_DICT[course['campusCode']] = course['campusName']
                    }
                }
            })
        }

        const returnArray = []
        CAMPUS_SET.forEach(code => {
            returnArray.push({
                "code": code,
                "name": CAMPUS_DICT[code]
            })
        })
        return returnArray
    }
    getCampuses = _getCampuses

    // returns true if the course is taught by an unwanted instructor
    // returns false otherwise
    function _unwantedProf(course, ASP_INFO) {
        //blegh go my n^2
        if ('instructors' in course && typeof(course['instructors']) == typeof([])) {
            for (const i in ASP_INFO['avoidInstructors']) {
                const avoid = ASP_INFO['avoidInstructors'][i]
                for (const j in course['instructors']) {
                    const teaching = course['instructors'][j]
                    if (teaching['person']['uniqueId'] == avoid) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // returns true if the course has a desired attribute (e.g. perspective area)
    function _desiredAttribute(course, ASP_INFO) {
        //blegh go my n^2 time 2
        if ('attributes' in course && typeof(course['attributes']) == typeof([])) {
            for (const i in ASP_INFO['attributes']) {
                const want = ASP_INFO['attributes'][i]
                for (const j in course['attributes']) {
                    const has = course['attributes'][j]
                    if (has['code'] == want) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // returns the coursecode for a course (e.g. CSE102)
    // will be returned lowercase
    function _getCourseCode(course) {
        const INFO = course['course']

        const CODE = (INFO['subjectCode'] + INFO['number']).toLowerCase()
        return CODE
    }

    // returns true if the course passes the checks in ASP_INFO
    // returns false if not
    function _isValidCourse(course, ASP_INFO) {
        // count out courses that aren't valid with little inspection required
        if (ASP_INFO['avoidSections'].includes(course['crn'])) {
            return false
        } else if (!(ASP_INFO['campuses'].includes(course['campusCode']))) {
            return false
        } else if (_unwantedProf(course, ASP_INFO)) {
            return false
        } else {
            // now we can dive in and check the course code
           const CODE = _getCourseCode(course)

            if (ASP_INFO['avoidCourses'].includes(CODE)) {
                return false
            }

            // after all the failure checks, now we check for explicitly things we want
            if (ASP_INFO['possibleCourses'].includes(CODE) || ASP_INFO['requiredCourses'].includes(CODE)) {
                return true
            } else if (_desiredAttribute(course, ASP_INFO)) {
                return true;
            }
        }

        // if we can't make a strict decision, choose to not include it
        return false;
    }

    const DAY_TO_ATOM = {
        "M": "monday",
        "T": "tuesday",
        "W": "wednesday",
        "R": "thursday",
        "F": "friday",
        "S": "saturday",
        "U": "sunday"
    }

    // convert a course object into ASP predicates to be directly inserted into the program
    function _makeASPCourse(course) {
        const CODE = _getCourseCode(course)
        const CRN = course['crn']

        let predicateString = ""

        predicateString += `section(${CODE},${CRN}). `

        if ("instructors" in course) {
            course['instructors'].forEach(prof => {
                predicateString += `instructor(${CRN}, ${prof['person']['uniqueId']}). `
            })
        }

        if ('schedules' in course) {
            course['schedules'].forEach(schedule => {
                // final exams are put on the schedule where startdate==enddate
                // we don't care about that
                if (schedule['startDate'] != schedule['endDate']) {
                    if (schedule['days'] === null || schedule['startTime'] === null || schedule['endTIme'] === null) {
                         // we don't want to deal with this crap
                    } else {
                        const ST = new TimeWrapper(schedule['startTime'])
                        const ET = new TimeWrapper(schedule['endTime'])

                        for (const c of schedule['days']) {
                            predicateString += `schedule(${CRN},${ST.getASPTime()},${ET.getASPTime()},${DAY_TO_ATOM[c]}). `
                        }
                    }
                }
            })
        }

        return predicateString
    }

    // returns a presumably reasonable value for the course hours of a course
    function _getCourseHours(course) {
        if (course['creditHoursHigh'] == course['creditHoursLow']) {
            return Math.floor(course['creditHoursHigh'] * 10) // too easy!
        } else {
            // too hard!
            return Math.floor(course['creditHoursAvailable'][0]*10) // ¯\_(ツ)_/¯
        }
    }

    function _getSchedulableCoursePredicates(ASP_INFO) {
        const TERM_COURSES = COURSE_DATA['terms'][ASP_INFO['termId']]['courses']

        const COURSES = new Set()
        const COURSE_HOURS = {}
        let returnStr = ""
        TERM_COURSES.forEach(course => {
            if (_isValidCourse(course, ASP_INFO)) {
                returnStr += _makeASPCourse(course)

                const CODE = _getCourseCode(course)
                if (!COURSES.has(CODE)) {
                    COURSES.add(CODE)
                    COURSE_HOURS[CODE] = _getCourseHours(course)
                }
            }
        })

        COURSES.forEach(course => {
            returnStr += `course(${course},${COURSE_HOURS[course]}). `
        })

        return returnStr
    }

    async function _runASPScheduler(ASP_INFO) {
        let program = BASE_PROGRAM

        // add the basic things the program expects

        program += `max_hours(${ASP_INFO['hardMaxHours']}). min_hours(${ASP_INFO['hardMinHours']}). `
        ASP_INFO['requiredCourses'].forEach(code => {
            program += `must_course(${code}). `
        })

        // now we add on restrictions/optimizations based on user input
        if (ASP_INFO['hardDayOff']) {
            program += ":- 5=#count{D: weekday(D), taking(X), schedule(X, _, _, D)}. "
        }

        // ADD WHEN IMPLEMENTED HTML SIDE
        // if (ASP_INFO['wantCoursePriority'] > 0) {
        //     program += `:~ dev_want_course(C), taking(X), section(C, X). [-1@${ASP_INFO['wantCoursePriority']},C]`
        //     ASP_INFO['wantCourses'].forEach(course => {
        //         program += `dev_want_course(${course.toLowerCase()}). `
        //     })
        // }

        if (ASP_INFO['startTimePriority'] > 0) {
            program += `:~ start_time(DAY, TIME), TIME<${ASP_INFO['softStartTime'].getASPTime()}. [1@${ASP_INFO['startTimePriority']}, DAY]`
        }
        if (ASP_INFO['endTimePriority'] > 0) {
            program += `:~ end_time(DAY, TIME), TIME>${ASP_INFO['softEndTime'].getASPTime()}. [1@${ASP_INFO['endTimePriority']}, DAY]`
        }

        // generate our course predicates based on ASP_INFO, and add to our program
        program += _getSchedulableCoursePredicates(ASP_INFO)

        console.log(program)
    }
    runASPScheduler = _runASPScheduler
})()
