package ui

import (
	"embed"
	"io/fs"
)

//go:embed all:build/client
var distDir embed.FS

var DistDirFS, _ = fs.Sub(distDir, "build/client")
