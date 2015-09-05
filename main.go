package main 

import (
	"net/http"
	"encoding/json"
	"errors"
)

type Course struct {
	Id string `json:"id"`
	Title string `json:"title"`
	Desc string `json:"desc"`
	Prereqs string `json:"prereqs"`
	Projected string `json:"projected"`
	Link string `json:"link"`
	Hours string `json:"hours"`
}
type CourseDB struct {
	coursesById map[string]*Course
}

func (db *CourseDB) GetCourse (id string) (course *Course, err error) {
	course = db.coursesById[id]; if course == nil {
		return nil, errors.New("Course with id: \"" + id + "\" does not exist in database.")
	}
	return course, nil
}

func (db *CourseDB) PutCourse (id string, course Course) (err error) {
	db.coursesById[id] = &course
	return nil
}

// Default Request Handler
func defaultHandler(w http.ResponseWriter, r *http.Request) {
	header := w.Header()
	header.Add("Content-Type", "text/json")
	db := CourseDB{
		coursesById: map[string]*Course{
			"CSC101": &Course{
				Id: "CSC101",
				Title: "Intro to Comp. Sci.",
				Desc: "Learn about beginner programming",
				Prereqs: "No prereqs",
				Projected: "SP,FA",
				Link: "/dept_cs.html#CSC101",
				Hours: "CR:1,L:0,S:0",
			},
		},
	}
	course, getCourseErr := db.GetCourse(r.URL.Path[1:]); if getCourseErr != nil {
		w.Write([]byte(`{"error":"Error looking up course","message":"` + getCourseErr.Error() + `"}`))
		return
	}
	res, marshalErr := json.Marshal(course); if marshalErr != nil {
		w.Write([]byte(`{"error":"Error encoding course json","message":"` + marshalErr.Error() + `"}`))
		return
	}
	w.Write(res)
}

func main() {
	http.HandleFunc("/", defaultHandler)
	http.ListenAndServe(":8080", nil)
}

