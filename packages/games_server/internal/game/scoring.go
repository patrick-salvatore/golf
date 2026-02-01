package game

import (
	"math"
	"sort"
	"strings"
)

type ScoreInput struct {
	Gross    int
	Handicap float64
}

// CalculateNetScore computes the net score relative to par for a player on a specific hole
// handicap: The player's handicap index (or course handicap)
// allowance: The percentage of handicap to use (e.g., 1.0, 0.8). If 0, assumes 1.0.
// par: The par for the hole
// strokeIndex: The difficulty rating of the hole (1-18)
func CalculateNetScore(gross int, handicap float64, allowance float64, par int, strokeIndex int) int {
	if allowance == 0 {
		allowance = 1.0
	}
	playingHandicap := math.Round(handicap * allowance)

	// Strokes received
	strokes := int(playingHandicap) / 18
	remainder := int(playingHandicap) % 18

	if strokeIndex <= remainder {
		strokes++
	}

	return (gross - strokes) - par
}

// CalculateHoleScore computes the team score for a hole based on the format
// Returns the score relative to par (e.g., -1 for birdie, 0 for par)
func CalculateHoleScore(format string, scores []ScoreInput, par int, strokeIndex int, allowance float64) int {
	lowerFormat := strings.ToLower(format)

	// Scramble / Alternate Shot: Team score is the single gross score (minus par)
	// Usually there is only one score entry per team.
	if strings.Contains(lowerFormat, "scramble") || strings.Contains(lowerFormat, "alternate shot") {
		if len(scores) == 0 {
			return 0
		}
		// In case multiple scores exist (e.g. data error), take the lowest
		minGross := scores[0].Gross
		for _, s := range scores {
			if s.Gross < minGross {
				minGross = s.Gross
			}
		}
		return minGross - par
	}

	// Calculate Net Scores for all individual scores provided
	netScores := make([]int, len(scores))
	for i, s := range scores {
		netScores[i] = CalculateNetScore(s.Gross, s.Handicap, allowance, par, strokeIndex)
	}

	if len(netScores) == 0 {
		return 0
	}

	// Combined Score: Sum of all net scores
	// Note: "2-Man Best Ball (Combined)" will fall into the "Best Ball" logic below with scoresToCount = 2
	// unless explicitly "Combined Score" which implies ALL players.
	if strings.Contains(lowerFormat, "combined score") {
		sum := 0
		for _, net := range netScores {
			sum += net
		}
		return sum
	}

	// Best Ball Logic
	// Default to counting the best 1 score (e.g., "Best Ball", "4-Man Best Ball" renamed to just "Best Ball")
	scoresToCount := 1

	// "2-Man Best Ball (Combined)" - Sum of top 2 net scores
	// We check for "2-man" and "combined" in the name to trigger the count=2 logic.
	// Or if the legacy "2-Man Best Ball" name is still present and implies combined (as per previous logic).
	// To be safe and explicit:
	if strings.Contains(lowerFormat, "2-man") && (strings.Contains(lowerFormat, "best ball") || strings.Contains(lowerFormat, "combined")) {
		scoresToCount = 2
	}

	sort.Ints(netScores)

	total := 0
	for i := 0; i < scoresToCount && i < len(netScores); i++ {
		total += netScores[i]
	}

	return total
}
