using MEAIPDFTool.Server.Models;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace MEAIPDFTool.Server.Services
{
    public class TranslationService : ITranslationService
    {
        private readonly HttpClient _httpClient;
        private Dictionary<string, string> _protectedContent = new Dictionary<string, string>();
        private readonly TerminologyDictionary _terminology;

        public TranslationService(HttpClient httpClient, IWebHostEnvironment environment)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(30); // ✅ Set once here
            var path = Path.Combine(
            environment.ContentRootPath,
            "terminology.json");

            if (File.Exists(path))
            {
                var json = File.ReadAllText(path);

                _terminology = JsonSerializer.Deserialize<TerminologyDictionary>(
                    json,
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    })
                    ?? new TerminologyDictionary();
            }
            else
            {
                _terminology = new TerminologyDictionary();
            }
        }

        //public async Task<string> TranslateTextAsync(string text, string sourceLang, string targetLang)
        //{
        //    if (string.IsNullOrWhiteSpace(text))
        //        return string.Empty;

        //    try
        //    {
        //        var normalizedText = NormalizeCase(text);
        //        var processedText = ProtectContent(normalizedText);

        //        var url = "http://10.235.20.49:8979/translate";

        //        var payload = new
        //        {
        //            q = processedText,
        //            source = sourceLang,
        //            target = targetLang,
        //            format = "text",
        //            alternatives = 3,
        //            api_key = ""
        //        };

        //        var content = new StringContent(
        //            JsonSerializer.Serialize(payload),
        //            Encoding.UTF8,
        //            "application/json"
        //        );

        //        _httpClient.Timeout = TimeSpan.FromSeconds(30);

        //        var response = await _httpClient.PostAsync(url, content);
        //        response.EnsureSuccessStatusCode();

        //        var result = await response.Content.ReadAsStringAsync();

        //        Console.WriteLine($"LibreTranslate raw response: {result}");

        //        var translationResult = JsonSerializer.Deserialize<TranslationResponse>(result);

        //        // 🔹 Collect all candidates
        //        var candidates = new List<string>();

        //        if (!string.IsNullOrWhiteSpace(translationResult?.translatedText))
        //            candidates.Add(translationResult.translatedText);

        //        if (translationResult?.alternatives != null && translationResult.alternatives.Any())
        //            candidates.AddRange(translationResult.alternatives);

        //        if (!candidates.Any())
        //            return RestoreContent(processedText);

        //        // 🔹 Pick BEST translation
        //        string best = candidates
        //            .OrderByDescending(t => t.Length)                 // more complete
        //            .ThenBy(t => CountPlaceholders(t))               // fewer ___PRTCT___
        //            .First();

        //        // ✅ Fix - trust translatedText first
        //        if (!string.IsNullOrWhiteSpace(translationResult?.translatedText))
        //        {
        //            best = RestoreContent(translationResult.translatedText);
        //            return best;
        //        }

        //        // Fallback to alternatives only if translatedText is empty
        //        if (translationResult?.alternatives != null && translationResult.alternatives.Any())
        //        {
        //            best = RestoreContent(translationResult.alternatives.First());
        //            return best;
        //        }

        //        best = RestoreContent(best);
        //        return best;
        //    }
        //    catch (Exception ex)
        //    {
        //        throw new Exception($"Translation failed: {ex.Message}", ex);
        //    }
        //}

        public async Task<string> TranslateTextAsync(
     string text,
     string sourceLang,
     string targetLang)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text;

            text = text.Trim();

            // Normalize language codes
            sourceLang = sourceLang.ToLowerInvariant();
            targetLang = targetLang.ToLowerInvariant();

            // -----------------------------------------
            // 1. Check terminology for exact match
            // -----------------------------------------

            var terminologyKey = $"{sourceLang}-{targetLang}";

            Dictionary<string, string>? dictionary = terminologyKey switch
            {
                "ja-en" => _terminology.JaEn,
                "en-ja" => _terminology.EnJa,
                _ => null
            };

            if (dictionary != null &&
                dictionary.TryGetValue(text, out var terminologyTranslation))
            {
                return terminologyTranslation;
            }

            // -----------------------------------------
            // 2. Normal LibreTranslate translation
            // -----------------------------------------

            var result = await TranslateSingleAsync(
                text,
                sourceLang,
                targetLang);

            return string.IsNullOrWhiteSpace(result)
                ? text
                : result;
        }

        private async Task<string> TranslateSingleAsync(string text, string sourceLang, string targetLang)
        {
            var processedText = ProtectContent(text);

            var payload = new
            {
                q = processedText,
                source = sourceLang,
                target = targetLang,
                format = "text",
                alternatives = 3,
                api_key = ""
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            //_httpClient.Timeout = TimeSpan.FromSeconds(30);
            var response = await _httpClient.PostAsync("http://10.235.20.49:8979/translate", content);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadAsStringAsync();
            var translationResult = JsonSerializer.Deserialize<TranslationResponse>(result);

            // Trust translatedText first
            if (!string.IsNullOrWhiteSpace(translationResult?.translatedText))
                return RestoreContent(translationResult.translatedText);

            // Fallback to first alternative
            var firstAlt = translationResult?.alternatives?.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(firstAlt))
                return RestoreContent(firstAlt);

            return string.Empty;
        }

        private string ToSentenceCase(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return text;
            var lower = text.ToLower();
            return Regex.Replace(lower, @"(^|(?<=[.!?]\s+))([a-z])",
                m => m.Value.ToUpper());
        }

        private string ToTitleCase(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return text;
            return System.Globalization.CultureInfo.CurrentCulture
                .TextInfo.ToTitleCase(text.ToLower());
        }

        private string NormalizeCase(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return text;

            // Split on sentence endings, lowercase each, capitalize first letter
            return Regex.Replace(text.ToLower(), @"(^|(?<=[.!?]\s+))([a-z])",
                m => m.Value.ToUpper());
        }

        private static int CountPlaceholders(string s)
        {
            if (string.IsNullOrEmpty(s)) return int.MaxValue;
            return Regex.Matches(s, "___PRTCT").Count;
        }

        private string ProtectContent(string text)
        {
            _protectedContent.Clear();
            int counter = 0;

            // Protect numbers with units (5kg, 10km, $100)
            text = Regex.Replace(text, @"[\$£€]?\d+(\.\d+)?(%|kg|km|cm|mm|ml|mg|lb|oz|ft|in)?", match =>
            {
                var key = $"___PRTCT_NUM_{counter}___";
                _protectedContent[key] = match.Value;
                counter++;
                return key;
            });

            // Protect dates
            text = Regex.Replace(text, @"(?<!\d)(\d{1,2})[/-](\d{1,2})([/-]\d{2,4})?(?!\d)", match =>
            {
                var key = $"___PRTCT_DATE_{counter}___";
                _protectedContent[key] = match.Value;
                counter++;
                return key;
            });

            // Protect URLs
            text = Regex.Replace(text, @"https?://[^\s\u3000]+", match =>
            {
                var key = $"___PRTCT_URL_{counter}___";
                _protectedContent[key] = match.Value;
                counter++;
                return key;
            });

            // Protect emails
            text = Regex.Replace(text, @"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", match =>
            {
                var key = $"___PRTCT_EMAIL_{counter}___";
                _protectedContent[key] = match.Value;
                counter++;
                return key;
            });

            // Protect proper nouns in ALL CAPS (like NASA, WHO, UN)
            text = Regex.Replace(text, @"\b[A-Z]{2,}\b", match =>
            {
                var key = $"___PRTCT_CAPS_{counter}___";
                _protectedContent[key] = match.Value;
                counter++;
                return key;
            });

            return text;
        }

        private string RestoreContent(string text)
        {
            Console.WriteLine($"Before restoration: {text}");
            Console.WriteLine($"Protected content dictionary has {_protectedContent.Count} items");

            foreach (var kvp in _protectedContent)
            {
                Console.WriteLine($"Looking for: '{kvp.Key}' to replace with '{kvp.Value}'");
            }

            // The translation service might modify placeholders, so we need fuzzy matching
            // Find any pattern that looks like our placeholder even if partially modified
            text = Regex.Replace(text, @"___PRTCT_[^_]*_(\d+)___", match =>
            {
                // Extract the counter number from the corrupted placeholder
                var counterMatch = Regex.Match(match.Value, @"_(\d+)___");
                if (counterMatch.Success)
                {
                    var counterStr = counterMatch.Groups[1].Value;

                    // Find the original placeholder with this counter
                    var originalPlaceholder = _protectedContent.Keys
                        .FirstOrDefault(k => k.Contains($"_{counterStr}___"));

                    if (originalPlaceholder != null)
                    {
                        Console.WriteLine($"Restoring corrupted '{match.Value}' -> '{_protectedContent[originalPlaceholder]}'");
                        return _protectedContent[originalPlaceholder];
                    }
                }

                return match.Value;
            });

            // Also try exact matches for any that weren't corrupted
            foreach (var kvp in _protectedContent)
            {
                if (text.Contains(kvp.Key))
                {
                    text = text.Replace(kvp.Key, kvp.Value);
                    Console.WriteLine($"Restored exact match: {kvp.Key} -> {kvp.Value}");
                }
            }

            Console.WriteLine($"After restoration: {text}");

            return text;
        }
        private class TranslationResponse
        {
            public string translatedText { get; set; }
            public List<string> alternatives { get; set; }
        }
    }
}