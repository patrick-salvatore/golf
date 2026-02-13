package game

import (
	"math"
	"testing"
)

func TestCalculateCourseHandicap(t *testing.T) {
	tests := []struct {
		name          string
		handicapIndex float64
		courseRating  float64
		slopeRating   int
		coursePar     int
		expected      float64
	}{
		{
			name:          "Standard course with 10 handicap",
			handicapIndex: 10.0,
			courseRating:  72.0,
			slopeRating:   113,
			coursePar:     72,
			expected:      10.0, // (10 * 113 / 113) + (72 - 72) = 10
		},
		{
			name:          "Difficult course (higher slope)",
			handicapIndex: 10.0,
			courseRating:  73.5,
			slopeRating:   140,
			coursePar:     72,
			expected:      13.89, // (10 * 140 / 113) + (73.5 - 72) ≈ 13.89
		},
		{
			name:          "Easy course (lower slope)",
			handicapIndex: 10.0,
			courseRating:  70.0,
			slopeRating:   100,
			coursePar:     72,
			expected:      6.85, // (10 * 100 / 113) + (70 - 72) ≈ 6.85
		},
		{
			name:          "Zero handicap player",
			handicapIndex: 0.0,
			courseRating:  72.0,
			slopeRating:   113,
			coursePar:     72,
			expected:      0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := CalculateCourseHandicap(tt.handicapIndex, tt.courseRating, tt.slopeRating, tt.coursePar)
			if math.Abs(result-tt.expected) > 0.01 {
				t.Errorf("CalculateCourseHandicap() = %v, want %v", result, tt.expected)
			}
		})
	}
}
