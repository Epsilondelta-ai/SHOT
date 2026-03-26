package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

var httpClient = &http.Client{Timeout: 30 * time.Second}

// Message 는 LLM 대화 메시지를 나타낸다.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Response 는 LLM 응답을 나타낸다.
type Response struct {
	Content string
}

// CallLLM 은 프로바이더와 모델에 맞는 LLM API를 호출한다.
// 최대 maxRetries회 재시도한다.
func CallLLM(provider, modelID, apiKey, baseURL, systemPrompt, userPrompt string, maxRetries int) (*Response, error) {
	var lastErr error
	for i := 0; i < maxRetries; i++ {
		resp, err := callOnce(provider, modelID, apiKey, baseURL, systemPrompt, userPrompt)
		if err == nil {
			return resp, nil
		}
		lastErr = err
		time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
	}
	return nil, fmt.Errorf("LLM 호출 %d회 실패: %w", maxRetries, lastErr)
}

func callOnce(provider, modelID, apiKey, baseURL, systemPrompt, userPrompt string) (*Response, error) {
	switch provider {
	case "openai":
		return callOpenAI(modelID, apiKey, baseURL, systemPrompt, userPrompt)
	case "anthropic":
		return callAnthropic(modelID, apiKey, baseURL, systemPrompt, userPrompt)
	case "google":
		return callGoogle(modelID, apiKey, baseURL, systemPrompt, userPrompt)
	case "xai":
		return callXAI(modelID, apiKey, baseURL, systemPrompt, userPrompt)
	default:
		return nil, fmt.Errorf("지원하지 않는 프로바이더: %s", provider)
	}
}

// --- OpenAI ---

func callOpenAI(modelID, apiKey, baseURL, systemPrompt, userPrompt string) (*Response, error) {
	if baseURL == "" {
		baseURL = "https://api.openai.com"
	}
	body := map[string]any{
		"model": modelID,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
		"max_tokens":  500,
	}
	data, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", baseURL+"/v1/chat/completions", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("OpenAI API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	if len(result.Choices) == 0 {
		return nil, fmt.Errorf("OpenAI: 빈 응답")
	}
	return &Response{Content: result.Choices[0].Message.Content}, nil
}

// --- Anthropic ---

func callAnthropic(modelID, apiKey, baseURL, systemPrompt, userPrompt string) (*Response, error) {
	if baseURL == "" {
		baseURL = "https://api.anthropic.com"
	}
	body := map[string]any{
		"model":      modelID,
		"max_tokens": 500,
		"system":     systemPrompt,
		"messages": []map[string]string{
			{"role": "user", "content": userPrompt},
		},
	}
	data, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", baseURL+"/v1/messages", bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Anthropic API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	if len(result.Content) == 0 {
		return nil, fmt.Errorf("Anthropic: 빈 응답")
	}
	return &Response{Content: result.Content[0].Text}, nil
}

// --- Google (Gemini) ---

func callGoogle(modelID, apiKey, baseURL, systemPrompt, userPrompt string) (*Response, error) {
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}
	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", baseURL, modelID, apiKey)

	body := map[string]any{
		"system_instruction": map[string]any{
			"parts": []map[string]string{
				{"text": systemPrompt},
			},
		},
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{"text": userPrompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"temperature":     0.7,
			"maxOutputTokens": 500,
		},
	}
	data, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(data))
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Google API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("Google: 빈 응답")
	}
	return &Response{Content: result.Candidates[0].Content.Parts[0].Text}, nil
}

// --- xAI (Grok) — OpenAI 호환 API ---

func callXAI(modelID, apiKey, baseURL, systemPrompt, userPrompt string) (*Response, error) {
	if baseURL == "" {
		baseURL = "https://api.x.ai"
	}
	return callOpenAI(modelID, apiKey, baseURL, systemPrompt, userPrompt)
}
