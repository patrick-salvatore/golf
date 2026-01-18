package utils

import (
	"fmt"
	"os"
	"reflect"
)

func GetEnvVarOrPanic(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(key + " is not set")
	}

	return value
}

func PrintStruct(s interface{}) {
	v := reflect.ValueOf(s)
	t := reflect.TypeOf(s)

	// Make sure it's a struct
	if v.Kind() != reflect.Struct {
		fmt.Println("PrintStruct: provided value is not a struct")
		return
	}

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i).Name
		value := v.Field(i).Interface()
		fmt.Printf("%s: %v\n", field, value)
	}
}
