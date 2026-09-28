using MEAIPDFTool.Server.Services;
using Tesseract;

namespace MEAIPDFTool.Server.Services
{
    public class OcrService : IOcrService
    {
        private readonly IConfiguration _configuration;
        private readonly string _tessDataPath;

        public OcrService(IConfiguration configuration)
        {
            _configuration = configuration;
            _tessDataPath = _configuration["TessDataPath"] ?? @"C:\Program Files\Tesseract-OCR\tessdata";
        }

        // Helper method to map standard language codes to Tesseract codes
        private string GetTesseractLanguageCode(string sourceLang)
        {
            if (string.IsNullOrWhiteSpace(sourceLang)) return "eng";

            return sourceLang.ToLower() switch
            {
                "ja" or "jpn" => "jpn",
                "es" or "spa" => "spa",
                "fr" or "fra" => "fra",
                "de" or "deu" => "deu",
                "zh" or "chi" => "chi_sim", // Simplified Chinese
                _ => "eng" // Default to English
            };
        }

        public async Task<string> ExtractTextFromImageAsync(string imagePath, string sourceLang = "en")
        {
            if (!File.Exists(imagePath))
                throw new FileNotFoundException($"Image not found: {imagePath}");

            var tesseractLang = GetTesseractLanguageCode(sourceLang);

            return await Task.Run(() =>
            {
                try
                {
                    using var engine = new TesseractEngine(_tessDataPath, tesseractLang, EngineMode.Default);
                    using var img = Pix.LoadFromFile(imagePath);
                    using var page = engine.Process(img);

                    var confidence = page.GetMeanConfidence();

                    if (confidence < 0.3f)
                    {
                        return string.Empty;
                    }

                    return page.GetText();
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"OCR processing failed for language '{tesseractLang}': {ex.Message}");
                }
            });
        }

        public async Task<List<string>> ExtractTextFromMultipleImagesAsync(List<string> imagePaths, string sourceLang = "en")
        {
            var results = new List<string>();

            foreach (var imagePath in imagePaths)
            {
                var text = await ExtractTextFromImageAsync(imagePath, sourceLang);
                results.Add(text);
            }

            return results;
        }
    }
}