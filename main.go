package main 

import (
	"net/http"
	"encoding/json"
	"time"
	"strconv"
	"io/ioutil"
	"io"
	"os"
	"fmt"
	"github.com/gorilla/websocket"
)

const relSrcDir = "./src/github.com/ZombieHippie/GoCourseSort"

func main() {
	db := CourseDB{
		coursesById: map[string]*Course{},
	}
	wd, _ := os.Getwd()
	fmt.Println("Working Directory: ", wd)
	
	// Populate CourseDB
	catalog_pagesDir := relSrcDir + "/new_catalog_pages"
	finfos, readDirErr := ioutil.ReadDir(catalog_pagesDir); if (readDirErr != nil) {
		fmt.Println(readDirErr.Error())
		return
	}
	for _, finfo := range finfos {
		if !finfo.IsDir() {
			filePath := catalog_pagesDir + "/" + finfo.Name()
			file, fileOpenErr := os.Open(filePath); if fileOpenErr != nil {
				fmt.Println(fileOpenErr.Error())
				return
			}
			dec := json.NewDecoder(file)
			// decode json into database
			for {
				var c Course
				if err := dec.Decode(&c); err == io.EOF {
					break
				} else if err != nil {
					fmt.Println(err)
				}
				db.PutCourse(c.Id, c)
			}
		}
	}
	fmt.Printf("Populated Database with %d courses.\n", len(db.coursesById))
	db.CreateIndexCourseKeywords()
	
	http.HandleFunc("/byId/", func (w http.ResponseWriter, r *http.Request) {
		header := w.Header()
		timerStart := time.Now()
		
		header.Add("Content-Type", "text/json")
		courseId := r.URL.Path[6:]
		course, getCourseErr := db.GetCourse(courseId); if getCourseErr != nil {
			defer w.Write([]byte(`{"error":"Error looking up course","message":"` + getCourseErr.Error() + `"}`))
		}
		res, marshalErr := json.Marshal(course); if marshalErr != nil {
			defer w.Write([]byte(`{"error":"Error encoding course json","message":"` + marshalErr.Error() + `"}`))
		}
		if marshalErr == nil && getCourseErr == nil {
			defer w.Write(res)
		}
		dur := time.Now().Sub(timerStart)
		header.Add("X-Execution-Time", strconv.Itoa(int(dur.Nanoseconds())))
	})
	
	//var scriptJS string
	http.HandleFunc("/js/", func (w http.ResponseWriter, r *http.Request) {
		file, err := os.Open(relSrcDir + "/js/" + r.URL.Path[4:]); if err != nil {
			w.WriteHeader(500)
			w.Write([]byte(err.Error()))
		}
		w.Header().Add("Content-Type", "text/javascript")
		io.Copy(w, file)
	})
	
	http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`<html>
<head></head>
<body>
<h1>GoCourseSort</h1>
<br>
<form id="searchGoCourseSort">
<label for="searchCourses">Search</label>
<input id="searchCourses" name="q" type="text">
<input type="submit" value="Go">
</form>
<br>
<div id="output"></div>
<script src="/js/gocoursesort.js" type="text/javascript"></script>
<script src="/js/script.js" type="text/javascript"></script>
</body>
</html>`))
	})
	
	
	// websocket stuff:
	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	    ReadBufferSize:  512,
	    WriteBufferSize: 512,
	}
	var readLoop = func (conn *websocket.Conn) {
	    for {
	        _, messageReader, err := conn.NextReader();if err != nil {
	            conn.Close()
	            break
	        }
	        message := make([]byte, 140)
	        length, err := messageReader.Read(message); if err != nil && err != io.EOF {
	        	fmt.Println("readLoop readError", err.Error())
	        }
	        messageString := string(message[:length])
	        var messageType byte
	        messageType, messageString = messageString[0], messageString[1:]
	        switch messageType {
	        	case '!':
				course, getCourseErr := db.GetCourse(messageString); if getCourseErr != nil {
					conn.WriteJSON(getCourseErr.Error())
					continue
				}
				writeErr := conn.WriteJSON(course); if writeErr != nil {
					continue
				}
				case '?':
				// do search		
				//timerStart := time.Now()
				searchResults := db.SearchKeywords(messageString)
				//dur := time.Now().Sub(timerStart)
				//fmt.Println("Search Execution Time:", 1E-9 * float64(dur.Nanoseconds()))
				conn.WriteJSON(searchResults)
	        }
	    }
	}
	http.HandleFunc("/websocket", func (w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil); if err != nil {
			fmt.Println(err)
			return
		}
		
		go readLoop(conn)
	})
	
	http.ListenAndServe(":8080", nil)
}

