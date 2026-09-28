using System.Text.Json.Serialization;

namespace MEAIPDFTool.Server.Models
{
    public class TerminologyDictionary
    {
        [JsonPropertyName("ja-en")]
        public Dictionary<string, string> JaEn { get; set; } = new();

        [JsonPropertyName("en-ja")]
        public Dictionary<string, string> EnJa { get; set; } = new();
    }
}
