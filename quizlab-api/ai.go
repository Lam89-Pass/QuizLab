package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type AIGenerateRequest struct {
	Material string `json:"material"`
	Count    int    `json:"count"`
	Type     string `json:"type"` // "mc", "tf", "mixed"
	APIKey   string `json:"apiKey"`
}

type AIGeneratedQuestion struct {
	Text        string   `json:"text"`
	Type        string   `json:"type"`
	Options     []string `json:"options"`
	Correct     int      `json:"correct"`
	Duration    int      `json:"duration"`
	Explanation string   `json:"explanation"`
}

type AIGenerateResponse struct {
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Questions   []AIGeneratedQuestion `json:"questions"`
}

// POST /api/ai/generate (authed) -> Generate kuis otomatis dari bahan materi
func (a *App) generateAIQuiz(c *gin.Context) {
	var req AIGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format JSON tidak valid"})
		return
	}

	req.Material = strings.TrimSpace(req.Material)
	if req.Material == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bahan materi tidak boleh kosong"})
		return
	}

	if req.Count <= 0 {
		req.Count = 5
	}
	if req.Count > 20 {
		req.Count = 20
	}
	if req.Type == "" {
		req.Type = "mc"
	}

	apiKey := strings.TrimSpace(req.APIKey)
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	}

	// Jika ada API Key Gemini, coba generate dengan Gemini API
	if apiKey != "" {
		quiz, err := generateWithGemini(c.Request.Context(), apiKey, req)
		if err == nil && len(quiz.Questions) > 0 {
			c.JSON(http.StatusOK, quiz)
			return
		}
	}

	// Fallback Smart Generator jika tanpa API key atau jika limit Gemini tercapai
	quiz := generateSmartFallback(req)
	c.JSON(http.StatusOK, quiz)
}

func generateWithGemini(ctx context.Context, apiKey string, req AIGenerateRequest) (*AIGenerateResponse, error) {
	prompt := fmt.Sprintf(`Kamu adalah guru dan pembuat kuis profesional.
Buat kuis pilihan ganda berdasarkan bahan materi berikut:
---
%s
---

Tugas:
1. Buat judul kuis yang menarik dan deskripsi singkat.
2. Buatkan TEPAT %d pertanyaan berkualitas tinggi berdasarkan bahan materi di atas.
3. Tipe pertanyaan: %s ('mc' = pilihan ganda 4 opsi, 'tf' = Benar/Salah).
4. Sediakan kunci jawaban (indeks opsi benar dimulai dari 0).
5. Sediakan penjelasan edukatif mengapa jawaban tersebut benar (explanation).
6. Durasi per soal antara 10 sampai 20 detik.

Kembalikan HANYA format JSON valid tanpa tanda markdown backtick tambahan:
{
  "title": "Judul Kuis",
  "description": "Deskripsi singkat kuis",
  "questions": [
    {
      "text": "Teks pertanyaan?",
      "type": "mc",
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "correct": 0,
      "duration": 15,
      "explanation": "Penjelasan mengapa jawaban benar"
    }
  ]
}`, req.Material, req.Count, req.Type)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s", apiKey)

	payload := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"responseMimeType": "application/json",
			"temperature":      0.7,
		},
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini api error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini returned empty content")
	}

	rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text
	rawJSON = strings.TrimSpace(rawJSON)
	rawJSON = strings.TrimPrefix(rawJSON, "```json")
	rawJSON = strings.TrimPrefix(rawJSON, "```")
	rawJSON = strings.TrimSuffix(rawJSON, "```")
	rawJSON = strings.TrimSpace(rawJSON)

	var result AIGenerateResponse
	if err := json.Unmarshal([]byte(rawJSON), &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// POST /api/ai/generate-from-file — accepts multipart/form-data with file, count, type, apiKey
func (a *App) generateAIQuizFromFile(c *gin.Context) {
	// Limit 100 MB
	if err := c.Request.ParseMultipartForm(100 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File terlalu besar, maksimal 100MB"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan. Pastikan nama field adalah 'file'"})
		return
	}
	if fileHeader.Size > 100<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File terlalu besar, maksimal 100MB"})
		return
	}

	// Count dan Type dari form
	count := 5
	if v := c.PostForm("count"); v != "" {
		fmt.Sscanf(v, "%d", &count)
	}
	if count <= 0 {
		count = 5
	}
	if count > 20 {
		count = 20
	}

	qtype := c.PostForm("type")
	if qtype == "" {
		qtype = "mc"
	}

	apiKey := strings.TrimSpace(c.PostForm("apiKey"))
	if apiKey == "" {
		apiKey = strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	}

	// Simpan ke temp dir
	tmpDir, err := os.MkdirTemp("", "quizlab-upload-*")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat direktori sementara"})
		return
	}
	defer os.RemoveAll(tmpDir)

	origName := fileHeader.Filename
	tmpPath := filepath.Join(tmpDir, origName)
	if err := c.SaveUploadedFile(fileHeader, tmpPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
		return
	}

	// Ekstrak teks berdasarkan ekstensi
	ext := strings.ToLower(filepath.Ext(origName))
	var material string

	switch ext {
	case ".pdf":
		material, err = extractPDF(tmpPath)
	case ".pptx":
		material, err = extractPPTX(tmpPath)
		if err != nil {
			material, err = extractOfficeViaPDF(tmpPath, tmpDir)
		}
	case ".docx":
		material, err = extractDOCX(tmpPath)
		if err != nil {
			material, err = extractOfficeViaPDF(tmpPath, tmpDir)
		}
	case ".ppt", ".doc", ".odp", ".odt", ".odf":
		material, err = extractOfficeViaPDF(tmpPath, tmpDir)
	case ".txt", ".md", ".csv":
		var raw []byte
		raw, err = os.ReadFile(tmpPath)
		if err == nil {
			material = string(raw)
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Format file '%s' belum didukung. Gunakan: PDF, PPT, PPTX, DOC, DOCX, TXT", ext)})
		return
	}

	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Gagal membaca isi file: " + err.Error()})
		return
	}

	material = strings.TrimSpace(material)
	if len([]rune(material)) < 50 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "Teks yang berhasil diekstrak terlalu sedikit. Coba file lain atau gunakan input teks langsung."})
		return
	}

	// Batasi panjang materi agar tidak overload token
	const maxRunes = 8000
	runes := []rune(material)
	if len(runes) > maxRunes {
		material = string(runes[:maxRunes])
	}

	req := AIGenerateRequest{
		Material: material,
		Count:    count,
		Type:     qtype,
		APIKey:   apiKey,
	}

	// Generate
	if apiKey != "" {
		quiz, gerr := generateWithGemini(c.Request.Context(), apiKey, req)
		if gerr == nil && len(quiz.Questions) > 0 {
			c.JSON(http.StatusOK, quiz)
			return
		}
	}

	quiz := generateSmartFallback(req)
	c.JSON(http.StatusOK, quiz)
}

// extractPDF mengekstrak teks dari file PDF menggunakan pdftotext (ambil hingga 30 halaman pertama agar cepat)
func extractPDF(path string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	// Ambil halaman 1 sampai 30 agar PDF tebal/buku tidak berat/lama
	out, err := exec.CommandContext(ctx, "pdftotext", "-f", "1", "-l", "30", "-layout", path, "-").Output()
	if err != nil {
		// Coba tanpa flag batas halaman jika gagal
		out, err = exec.CommandContext(ctx, "pdftotext", "-layout", path, "-").Output()
		if err != nil {
			return "", fmt.Errorf("pdftotext gagal: %w", err)
		}
	}
	return string(out), nil
}

var tagRegex = regexp.MustCompile(`<[^>]*>`)
var pptxTextRegex = regexp.MustCompile(`<a:t[^>]*>(.*?)</a:t>`)
var docxTextRegex = regexp.MustCompile(`<w:t[^>]*>(.*?)</w:t>`)

// extractPPTX mengekstrak teks langsung dari file PPTX (struktur zip + xml)
func extractPPTX(path string) (string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", fmt.Errorf("bukan file PPTX valid: %w", err)
	}
	defer r.Close()

	var slideFiles []*zip.File
	for _, f := range r.File {
		if strings.HasPrefix(f.Name, "ppt/slides/slide") && strings.HasSuffix(f.Name, ".xml") {
			slideFiles = append(slideFiles, f)
		}
	}

	sort.Slice(slideFiles, func(i, j int) bool {
		return slideFiles[i].Name < slideFiles[j].Name
	})

	var sb strings.Builder
	for idx, sf := range slideFiles {
		rc, err := sf.Open()
		if err != nil {
			continue
		}
		data, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		matches := pptxTextRegex.FindAllStringSubmatch(string(data), -1)
		var words []string
		for _, m := range matches {
			if len(m) > 1 {
				t := strings.TrimSpace(m[1])
				if t != "" {
					words = append(words, t)
				}
			}
		}
		if len(words) > 0 {
			sb.WriteString(fmt.Sprintf("\n--- Slide %d ---\n", idx+1))
			sb.WriteString(strings.Join(words, " "))
			sb.WriteString("\n")
		}
	}

	res := strings.TrimSpace(sb.String())
	if res == "" {
		return "", fmt.Errorf("tidak ada teks yang ditemukan di slide PPTX")
	}
	return res, nil
}

// extractDOCX mengekstrak teks langsung dari file DOCX (struktur zip + xml)
func extractDOCX(path string) (string, error) {
	r, err := zip.OpenReader(path)
	if err != nil {
		return "", fmt.Errorf("bukan file DOCX valid: %w", err)
	}
	defer r.Close()

	for _, f := range r.File {
		if f.Name == "word/document.xml" {
			rc, err := f.Open()
			if err != nil {
				return "", err
			}
			defer rc.Close()
			data, err := io.ReadAll(rc)
			if err != nil {
				return "", err
			}

			matches := docxTextRegex.FindAllStringSubmatch(string(data), -1)
			var words []string
			for _, m := range matches {
				if len(m) > 1 {
					t := strings.TrimSpace(m[1])
					if t != "" {
						words = append(words, t)
					}
				}
			}
			return strings.Join(words, " "), nil
		}
	}
	return "", fmt.Errorf("dokumen DOCX tidak memiliki word/document.xml")
}

// extractOfficeViaPDF mengonversi format dokumen lain (ppt jadul, odp, doc) ke PDF via LibreOffice, lalu dibaca pdftotext
func extractOfficeViaPDF(srcPath, outDir string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "soffice",
		"--headless",
		"--convert-to", "pdf",
		"--outdir", outDir,
		srcPath,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("konversi dokumen gagal: %w — %s", err, string(out))
	}

	base := strings.TrimSuffix(filepath.Base(srcPath), filepath.Ext(srcPath))
	pdfPath := filepath.Join(outDir, base+".pdf")
	if _, err := os.Stat(pdfPath); err != nil {
		return "", fmt.Errorf("file PDF hasil konversi tidak ditemukan: %w", err)
	}

	return extractPDF(pdfPath)
}

// generateSmartFallback membuat kuis cerdas jika Gemini API offline / tanpa API key
func generateSmartFallback(req AIGenerateRequest) *AIGenerateResponse {
	lines := strings.Split(req.Material, "\n")
	var validLines []string
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if len(l) > 10 {
			validLines = append(validLines, l)
		}
	}

	title := "Kuis Pembelajaran AI"
	if len(validLines) > 0 {
		firstLine := validLines[0]
		if len([]rune(firstLine)) > 40 {
			firstLine = string([]rune(firstLine)[:40]) + "..."
		}
		title = fmt.Sprintf("Kuis: %s", firstLine)
	}

	questions := []AIGeneratedQuestion{}
	targetCount := req.Count
	if targetCount < 1 {
		targetCount = 3
	}

	for idx := 0; idx < targetCount; idx++ {
		sourceLine := ""
		if len(validLines) > 0 {
			sourceLine = validLines[idx%len(validLines)]
		} else {
			sourceLine = req.Material
		}

		if req.Type == "tf" {
			questions = append(questions, AIGeneratedQuestion{
				Text:        fmt.Sprintf("Pernyataan berikut sesuai dengan materi: \"%s\"?", sourceLine),
				Type:        "tf",
				Options:     []string{"Benar", "Salah"},
				Correct:     0,
				Duration:    15,
				Explanation: fmt.Sprintf("Pernyataan ini tepat karena bersumber langsung dari materi: \"%s\".", sourceLine),
			})
		} else {
			questions = append(questions, AIGeneratedQuestion{
				Text: fmt.Sprintf("Berdasarkan materi: \"%s\", manakah kesimpulan yang paling tepat?", sourceLine),
				Type: "mc",
				Options: []string{
					sourceLine,
					"Informasi tidak disebutkan dalam bahan bacaan materi",
					"Hal tersebut bertentangan dengan konteks materi yang dibahas",
					"Fakta materi tidak relevan dengan pembahasan pokok",
				},
				Correct:     0,
				Duration:    15,
				Explanation: fmt.Sprintf("Pilihan A benar karena sesuai persis dengan informasi: \"%s\".", sourceLine),
			})
		}
	}

	return &AIGenerateResponse{
		Title:       title,
		Description: "Kuis ini dibuat secara otomatis dari ringkasan materi pelajaran.",
		Questions:   questions,
	}
}

