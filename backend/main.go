package main

import (
	"fmt"
	"net/http"
)

const PORT = 3000

func main() {
	http.Handle("/", http.FileServer(http.Dir("../src")))

	http.HandleFunc("/template", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../schema/template.json")
	})

	http.HandleFunc("/rule", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../schema/rule.json")
	})

	http.HandleFunc("/element", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../schema/element.json")
	})

	addr := fmt.Sprintf("localhost:%d", PORT)
	fmt.Println("Listening on", addr)
	http.ListenAndServe(addr, nil)
}
