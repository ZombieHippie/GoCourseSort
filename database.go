package main

import (
	"fmt"
	"strings"
	"errors"
	"github.com/ZombieHippie/fuzzysearch/fuzzy"
	"sort"
	"regexp"
	"time"
)

// use short JSON identifiers for smaller sent data
type CourseHours struct {
	Credit int `json:"C"`
	Lecture int `json:"E"`
	Lab int `json:"L"`
}
type CourseOffered struct {
	Fall bool `json:"F"`
	Spring bool `json:"S"`
	Summer bool `json:"M"`
}
type Course struct {
	Id string `json:"I"`
	Title string `json:"T"`
	Desc string `json:"D"`
	Prereqs string `json:"P"`
	Link string `json:"L"`
	Offered CourseOffered `json:"O"`
	Hours CourseHours `json:"H"`
	titleKeywordsLen int
}
type CourseDB struct {
	coursesById map[string]*Course
	coursesByLink map[string][]*Course
	coursesByDepartment map[string][]*Course
	kwIndex map[string][]KeywordLink
	keywords []string
}

func (db *CourseDB) GetCourse (id string) (course *Course, err error) {
	var isMapped bool
	course, isMapped = db.coursesById[id]; if !isMapped {
		return nil, errors.New("Course with id: '" + id + "' does not exist in database.")
	}
	return course, nil
}

func (db *CourseDB) GetCourses (ids []string) DatabaseResults {
	timerStart := time.Now()
	res := make([]*Course, len(ids))
	for i, id := range ids {
		res[i], _ = db.GetCourse(id)
	}
	return DatabaseResults{
		Results: res,
		TotalResults: len(ids),
		ExecutionTime: 1E-9 * float64(time.Now().Sub(timerStart).Nanoseconds()),
	}
}

func (db *CourseDB) GetCoursesByLink (link string) DatabaseResults {
	timerStart := time.Now()
	
	res, exists := db.coursesByLink[link]; if !exists {
		res = make([]*Course,0)
	}
	
	return DatabaseResults{
		Results: res,
		TotalResults: len(res),
		ExecutionTime: 1E-9 * float64(time.Now().Sub(timerStart).Nanoseconds()),
	}
}

func (db *CourseDB) GetCoursesByDepartment (department string) DatabaseResults {
	timerStart := time.Now()
	
	res, exists := db.coursesByDepartment[department]; if !exists {
		res = make([]*Course,0)
	}
	
	return DatabaseResults{
		Results: res,
		TotalResults: len(res),
		ExecutionTime: 1E-9 * float64(time.Now().Sub(timerStart).Nanoseconds()),
	}
}

func (db CourseDB) String () string {
	res := "CourseDB:\n"
	for key, value := range db.coursesById {
		res += fmt.Sprintf("%v: %v\n", key, value)
	}
	return res
}

// borrowing the rank system from fuzzy
type sRank struct {
	// Target is the word matched against.
	Target *Course
	Distance int
}
type ranks []sRank

func (r ranks) Len() int {
	return len(r)
}

func (r ranks) Swap(i, j int) {
	r[i], r[j] = r[j], r[i]
}

func (r ranks) Less(i, j int) bool {
	if r[i].Distance == r[j].Distance {
		return r[i].Target.Title < r[j].Target.Title
	} else {
		return r[i].Distance > r[j].Distance
	}
}

type KeywordLinkRank struct {
	CourseTitle string
	Keyword string
	KeywordIndexInTitle int
	SearchTerm string
	SearchTermIndex int
	SearchTermDistance int
}

type searchTermRelevance struct {
	r1, r2, ex float64
}
func (st searchTermRelevance) score() float64 {
	return st.ex * .6667 + st.r1 * .2222 + st.r2 * .1111
}
func (st searchTermRelevance) Less(st2 searchTermRelevance) bool {
	return st.score() < st2.score()
}


type DatabaseResults struct {
	Results []*Course
	TotalResults int
	ExecutionTime float64
}

func (db *CourseDB) SearchKeywords (term string) DatabaseResults {
	timerStart := time.Now()
	// create a map of courses to keywords with ranks
	var keywordLinks = make(map[*Course][]KeywordLinkRank)
	
	termWords := regexp.MustCompile(`([a-zA-Z']+|\d+)`).FindAllString(term, -1)
	termWordsLen := len(termWords)
	for termWordIndex, termWord := range termWords {
		// each term
		maxDist := int(float64(len(termWord)) * .5)
		matchKeywords := fuzzy.RankFindLevenshtein(strings.ToLower(termWord), maxDist, db.keywords)
		if len(matchKeywords) > 0 {
			sort.Sort(matchKeywords)
			// highest distance from each matched keyword to term
			for _, matchKeywordRank := range matchKeywords {
				// sorted ranked keywords against term
				for _, kwLink := range db.kwIndex[matchKeywordRank.Target] {
					// courses with matched keyword
					klnkrnk := KeywordLinkRank{
						CourseTitle: kwLink.Course.Title,
						Keyword: matchKeywordRank.Target,
						KeywordIndexInTitle: kwLink.Index,
						SearchTerm: termWord,
						SearchTermIndex: termWordIndex,
						SearchTermDistance: matchKeywordRank.Distance,
					}
					_, ok := keywordLinks[kwLink.Course]; if !ok {
						keywordLinks[kwLink.Course] = []KeywordLinkRank{
							klnkrnk,
						}
					} else {
						keywordLinks[kwLink.Course] = append(keywordLinks[kwLink.Course], klnkrnk)
					}
				}
			}
		}
	}
	
	// Calculate total distances
	var searchRes = make(ranks, 0, len(keywordLinks))
	
	for course, keywordLinkRanks := range keywordLinks {
		// make sure all termWords match something in the title
		searchTermPresence := make(map[string]searchTermRelevance)
		for _, term := range termWords {
			// initiallize empty
			searchTermPresence[term] = searchTermRelevance{}
		}

		for _, klr := range keywordLinkRanks {
			relevance := 1.0 - (float64(klr.KeywordIndexInTitle) / float64(course.titleKeywordsLen))
			// the exactness tells us approximately how likely the word is relevant
			exactness := 1.0 - (float64(klr.SearchTermDistance) / float64(len(klr.Keyword)))
			relevance2 := 1.0 - (float64(klr.SearchTermIndex) / float64(termWordsLen))
			
			newSt := searchTermRelevance{
				r1: relevance,
				r2: relevance2,
				ex: exactness,
			}
			st := searchTermPresence[klr.SearchTerm]; if st.Less(newSt) {
				searchTermPresence[klr.SearchTerm] = newSt
			}
		}
		
		totalRelevance := 1.0
		for _, strelev := range searchTermPresence {
			totalRelevance *= strelev.score()
		}
		
		if totalRelevance > 0 {
			searchRes = append(searchRes, sRank{
				Target: course,
				Distance: int(1000 * totalRelevance),
			})
		}
	}
	
	sort.Sort(searchRes)
	
	limit := 10
	if limit > len(searchRes) {
		limit = len(searchRes)
	}
	res := make([]*Course, limit)
	for i, sr := range searchRes[:limit] {
		res[i] = sr.Target
	}
	return DatabaseResults{
		Results: res,
		TotalResults: len(searchRes),
		ExecutionTime: 1E-9 * float64(time.Now().Sub(timerStart).Nanoseconds()),
	}
}

func (db *CourseDB) SearchKeywordsExact (term string) DatabaseResults {
	timerStart := time.Now()
	// create a map of courses to keywords with ranks
	var keywordLinks = make(map[*Course][]KeywordLinkRank)
	
	termWords := regexp.MustCompile(`([a-zA-Z']+|\d+)`).FindAllString(term, -1)
	termWordsLen := len(termWords)
	for termWordIndex, termWord := range termWords {
		// each term
		termWordLower := strings.ToLower(termWord)
		matchKeywords := make([]string, 0)
		// find exact matching keywords
		for _, keyword := range db.keywords {
			if keyword == termWordLower {
				matchKeywords = append(matchKeywords, keyword)
			}
		}
		if len(matchKeywords) > 0 {
			// highest distance from each matched keyword to term
			for _, matchKeyword := range matchKeywords {
				// sorted ranked keywords against term
				for _, kwLink := range db.kwIndex[matchKeyword] {
					// courses with matched keyword
					klnkrnk := KeywordLinkRank{
						CourseTitle: kwLink.Course.Title,
						Keyword: matchKeyword,
						KeywordIndexInTitle: kwLink.Index,
						SearchTerm: termWord,
						SearchTermIndex: termWordIndex,
					}
					_, ok := keywordLinks[kwLink.Course]; if !ok {
						keywordLinks[kwLink.Course] = []KeywordLinkRank{
							klnkrnk,
						}
					} else {
						keywordLinks[kwLink.Course] = append(keywordLinks[kwLink.Course], klnkrnk)
					}
				}
			}
		}
	}
	
	// Calculate total distances
	var searchRes = make(ranks, 0, len(keywordLinks))
	
	for course, keywordLinkRanks := range keywordLinks {
		// make sure all termWords match something in the title
		searchTermPresence := make(map[string]searchTermRelevance)
		for _, term := range termWords {
			// initiallize empty
			searchTermPresence[term] = searchTermRelevance{}
		}

		for _, klr := range keywordLinkRanks {
			relevance := 1.0 - (float64(klr.KeywordIndexInTitle) / float64(course.titleKeywordsLen))
			// the exactness tells us approximately how likely the word is relevant
			exactness := 1.0 - (float64(klr.SearchTermDistance) / float64(len(klr.Keyword)))
			relevance2 := 1.0 - (float64(klr.SearchTermIndex) / float64(termWordsLen))
			
			newSt := searchTermRelevance{
				r1: relevance,
				r2: relevance2,
				ex: exactness,
			}
			st := searchTermPresence[klr.SearchTerm]; if st.Less(newSt) {
				searchTermPresence[klr.SearchTerm] = newSt
			}
		}
		
		totalRelevance := 1.0
		for _, strelev := range searchTermPresence {
			totalRelevance *= strelev.score()
		}
		
		if totalRelevance > 0 {
			searchRes = append(searchRes, sRank{
				Target: course,
				Distance: int(1000 * totalRelevance),
			})
		}
	}
	
	sort.Sort(searchRes)
	
	limit := 10
	if limit > len(searchRes) {
		limit = len(searchRes)
	}
	res := make([]*Course, limit)
	for i, sr := range searchRes[:limit] {
		res[i] = sr.Target
	}
	return DatabaseResults{
		Results: res,
		TotalResults: len(searchRes),
		ExecutionTime: 1E-9 * float64(time.Now().Sub(timerStart).Nanoseconds()),
	}
}

type KeywordLink struct {
	Course *Course
	Index int
}

func (db *CourseDB) CreateIndexCourseKeywords () {
	re := regexp.MustCompile(`([a-zA-Z']+|\d+)`)
	db.kwIndex = make(map[string][]KeywordLink)
	for _, course := range db.coursesById {
		// index courses by link
		byLink, exists := db.coursesByLink[course.Link]; if !exists {
			byLink = make([]*Course,0)
		}
		db.coursesByLink[course.Link] = append(byLink, course)
		
		// index courses by department
		byDept, exists := db.coursesByDepartment[course.Link]; if !exists {
			byDept = make([]*Course,0)
		}
		db.coursesByDepartment[course.Id[:3]] = append(byDept, course)
		coursesByDepartment[department]
		
		// index keywords
		titleKeywords := re.FindAllString(course.Title, -1)
		course.titleKeywordsLen = len(titleKeywords)
		for titleWordIndex, word := range titleKeywords {
			if len(word) > 0 {
				word = strings.ToLower(word)
				_, exists := db.kwIndex[word]; if !exists {
					db.kwIndex[word] = make([]KeywordLink, 0)
				}
				db.kwIndex[word] = append(db.kwIndex[word], KeywordLink{
						Course: course,
						Index: titleWordIndex,
					})
			}
		}
	}
	db.keywords = make([]string, 0)
	fmt.Printf("Keywords indexed: %d\n", len(db.kwIndex))
	for word := range db.kwIndex {
		db.keywords = append(db.keywords, word)
	}
}
func (db *CourseDB) PutCourse (id string, course Course) (err error) {
	db.coursesById[id] = &course
	return nil
}

