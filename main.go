package main 

import (
	"net/http"
	"encoding/json"
	"io/ioutil"
	"io"
	"os"
	"fmt"
	"github.com/gorilla/websocket"
	"strings"
)

//const relSrcDir = "./src/github.com/ZombieHippie/GoCourseSort"

func main() {
	if (len(os.Args) != 3) {
		fmt.Println("Incorrect number of command-line arguments.\nUsage: " + os.Args[0] + " <host> <GoCourseSort directory>")
		return
	}
	
	db := CourseDB{
		coursesById: map[string]*Course{},
		coursesByLink: map[string][]*Course{},
	}
	
	relSrcDir := os.Args[2]
	
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
<head>
<title>GoCourseSort - Missouri State Catalog Utility</title>
</head>
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
	        message := make([]byte, 40)
	        length, err := messageReader.Read(message); if err != nil && err != io.EOF {
	        	fmt.Println("readLoop readError", err.Error())
	        }
	        messageString := string(message[:length])
	        var messageType byte
	        messageType, messageString = messageString[0], messageString[1:]
	        switch messageType {
	        	case '!':
	        	// get by id
				courseResult, getCourseErr := db.GetCourse(messageString); if getCourseErr != nil {
					conn.WriteJSON(getCourseErr.Error())
					continue
				}
				writeErr := conn.WriteJSON(courseResult); if writeErr != nil {
					continue
				}
				case '?':
				// do search		
				searchResults := db.SearchKeywords(messageString)
				writeErr := conn.WriteJSON(searchResults); if writeErr != nil {
					continue
				}
				case '=':
				// do search exact keywords		
				searchResults := db.SearchKeywordsExact(messageString)
				writeErr := conn.WriteJSON(searchResults); if writeErr != nil {
					continue
				}
				case '&':
				// get multiple
				results := db.GetCourses(strings.Split(messageString, ";"))
				writeErr := conn.WriteJSON(results); if writeErr != nil {
					continue
				}
				case 'L':
				// get multiple
				results := db.GetCoursesByLink(messageString)
				writeErr := conn.WriteJSON(results); if writeErr != nil {
					continue
				}
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
	
	listenOn := os.Args[1]

	fmt.Println("Server listening on: ", listenOn)
	http.ListenAndServe(listenOn, nil)
}

