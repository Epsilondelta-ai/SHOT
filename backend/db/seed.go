package db

import (
	"log"

	"github.com/epsilondelta/shot/models"
)

// SeedData 는 기본 CreditPack과 OfficialBot 데이터를 삽입합니다.
// FirstOrCreate를 사용하여 멱등성을 보장합니다.
func SeedData() {
	creditPacks := []models.CreditPack{
		{Name: "Starter", Credits: 1000, PriceUSD: 0.99},
		{Name: "Gamer", Credits: 5500, PriceUSD: 4.99},
		{Name: "Enthusiast", Credits: 13000, PriceUSD: 9.99},
		{Name: "Champion", Credits: 30000, PriceUSD: 19.99},
	}

	for _, pack := range creditPacks {
		var existing models.CreditPack
		DB.Where("name = ?", pack.Name).FirstOrCreate(&existing, pack)
	}
	log.Println("seed: credit packs seeded")

	officialBots := []models.OfficialBot{
		{Name: "Rule-based Bot", ModelID: "rule-based", Provider: "internal", CreditCost: 0, Tier: "free", Description: "Simple rule-based bot, free to use"},
		{Name: "Grok 4.1 Fast", ModelID: "grok-4.1-fast", Provider: "xai", CreditCost: 5, Tier: "basic", Description: "Fast and cost-effective AI bot"},
		{Name: "GPT-4o mini", ModelID: "gpt-4o-mini", Provider: "openai", CreditCost: 5, Tier: "basic", Description: "OpenAI's efficient AI bot"},
		{Name: "Gemini 3 Flash", ModelID: "gemini-3-flash", Provider: "google", CreditCost: 10, Tier: "standard", Description: "Google's fast AI bot"},
		{Name: "Claude Haiku 4.5", ModelID: "claude-haiku-4-5-20251001", Provider: "anthropic", CreditCost: 25, Tier: "standard", Description: "Anthropic's compact AI bot"},
		{Name: "GPT-5", ModelID: "gpt-5", Provider: "openai", CreditCost: 50, Tier: "advanced", Description: "OpenAI's advanced AI bot"},
		{Name: "GPT-4o", ModelID: "gpt-4o", Provider: "openai", CreditCost: 60, Tier: "advanced", Description: "OpenAI's powerful multimodal bot"},
		{Name: "Claude Sonnet 4.6", ModelID: "claude-sonnet-4-6", Provider: "anthropic", CreditCost: 75, Tier: "advanced", Description: "Anthropic's balanced AI bot"},
		{Name: "Claude Opus 4.6", ModelID: "claude-opus-4-6", Provider: "anthropic", CreditCost: 125, Tier: "premium", Description: "Anthropic's most capable AI bot"},
	}

	for _, bot := range officialBots {
		var existing models.OfficialBot
		DB.Where("model_id = ?", bot.ModelID).FirstOrCreate(&existing, bot)
	}
	log.Println("seed: official bots seeded")
}
