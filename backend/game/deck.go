package game

import "math/rand"

// Card types
const (
	CardAttack  = "attack"
	CardHeal    = "heal"
	CardJail    = "jail"
	CardInspect = "inspect"
)

// Holding limits per card type
var HoldingLimit = map[string]int{
	CardAttack:  6,
	CardHeal:    2,
	CardJail:    1,
	CardInspect: -1, // unlimited
}

// BanishOnUse returns true if the card is removed from game when played.
func BanishOnUse(cardType string) bool {
	return cardType == CardJail || cardType == CardInspect
}

// BuildDeck creates the initial deck based on player/spy counts.
func BuildDeck(playerCount, spyCount int) []string {
	deck := make([]string, 0, playerCount*8+spyCount*2)

	for i := 0; i < playerCount*5; i++ {
		deck = append(deck, CardAttack)
	}
	for i := 0; i < playerCount*2; i++ {
		deck = append(deck, CardHeal)
	}
	for i := 0; i < playerCount*1; i++ {
		deck = append(deck, CardJail)
	}
	for i := 0; i < spyCount*2; i++ {
		deck = append(deck, CardInspect)
	}

	ShuffleDeck(deck)
	return deck
}

// ShuffleDeck randomizes the order of cards in place.
func ShuffleDeck(deck []string) {
	rand.Shuffle(len(deck), func(i, j int) {
		deck[i], deck[j] = deck[j], deck[i]
	})
}

// DrawFromDeck draws up to n cards from the deck.
// If the deck runs out, the discard pile is shuffled to form a new deck.
// Returns drawn cards and updated deck/discard.
func DrawFromDeck(deck, discard []string, n int) (drawn, newDeck, newDiscard []string) {
	newDeck = deck
	newDiscard = discard

	for range n {
		if len(newDeck) == 0 {
			if len(newDiscard) == 0 {
				break // no cards left anywhere
			}
			newDeck = newDiscard
			newDiscard = nil
			ShuffleDeck(newDeck)
		}
		drawn = append(drawn, newDeck[0])
		newDeck = newDeck[1:]
	}

	return drawn, newDeck, newDiscard
}

// CheckOverflow checks a player's hand for holding limit violations.
// Returns cards that exceed limits. Overflow cards go to discard (never banished).
func CheckOverflow(hand []string) (kept, overflow []string) {
	counts := map[string]int{}
	for _, c := range hand {
		counts[c]++
	}

	kept = make([]string, 0, len(hand))
	overflow = make([]string, 0)

	countsUsed := map[string]int{}
	for _, c := range hand {
		limit := HoldingLimit[c]
		if limit < 0 {
			// unlimited
			kept = append(kept, c)
			continue
		}
		countsUsed[c]++
		if countsUsed[c] <= limit {
			kept = append(kept, c)
		} else {
			overflow = append(overflow, c)
		}
	}

	return kept, overflow
}
