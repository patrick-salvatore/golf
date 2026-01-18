package security

import (
	cryptoRand "crypto/rand"
	"math/big"
)

const defaultRandomAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

func RandomString(length int) string {
	b := make([]byte, length)
	max := big.NewInt(int64(len(defaultRandomAlphabet)))

	for i := range b {
		n, err := cryptoRand.Int(cryptoRand.Reader, max)
		if err != nil {
			panic(err)
		}
		b[i] = defaultRandomAlphabet[n.Int64()]
	}

	return string(b)
}
