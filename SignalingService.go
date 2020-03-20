package main

import (
	"fmt"
	"net/http"
	"io/ioutil"
	"path"
	"encoding/json"
	"sync"
)

func main() {
	var err error

	fmt.Println("SignalingService for WEBRTC tutorial")

	http.Handle("/", http.FileServer(http.Dir("./")))
	fmt.Println("Please open SignalingService.initiator.html then SignalingService.responder.html")

	cache := make(map[string][]string)
	clock := sync.Mutex{}
	fmt.Println("Handle /api/offer /api/answer /api/icandidates /api/rcandidates")
	http.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		key := path.Base(r.URL.Path)
		if key != "offer" && key != "answer" && key != "icandidates" && key != "rcandidates" {
			http.Error(w, fmt.Sprintf("Illegal key %v and path %v", key, r.URL.Path), http.StatusInternalServerError)
			return
		}

		clock.Lock()
		defer clock.Unlock()

		if r.Method == "POST" {
			var b []byte
			if b,err = ioutil.ReadAll(r.Body); err != nil {
				fmt.Println("Read offer failed, err is", err)
				return
			}
			content := string(b)
			fmt.Println("Update", key, content)

			// If got initiator/offer, always reset all, to make responder/answer to restart.
			if key == "offer" {
				cache = make(map[string][]string)
				fmt.Println("Reset signaling because got offer/initiator")
			}

			// If got responder/answer, clear all candidates.
			if key == "answer" {
				cache["rcandidates"] = nil
				fmt.Println("Reset rcandidates because got answer/responder")
				// If clear initiator/offer to make it to restart.
				if _, ok := cache["answer"]; ok {
					cache = make(map[string][]string)
					fmt.Println("Reset signaling because already connected")
				}
			}

			values,_ := cache[key]
			if key == "offer" || key == "answer" {
				cache[key] = []string { content }
			} else { // candidates.
				cache[key] = append(values, content)
			}
		} else if r.Method == "GET" {
			values,ok := cache[key]
			if !ok {
				http.Error(w, fmt.Sprintf("No %v found", key), http.StatusInternalServerError)
				return
			}
			var content []byte
			if content, err = json.Marshal(values); err != nil {
				fmt.Println("Marshal", values, "failed, err is", err)
				return
			}
			if _,err = w.Write(content); err != nil {
				fmt.Println("Write", key, "failed, err is", err)
				return
			}
		} else {
			fmt.Println("Invalid method", r.Method)
		}
	})

	fmt.Println("Listen at :8888")
	if err = http.ListenAndServe(":8888", nil); err != nil {
		fmt.Println("HTTP serve failed, err is", err)
	}
}
