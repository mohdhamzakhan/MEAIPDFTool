namespace MEAIPDFTool.Server.DTO
{
    public class TranslatePdfRequest
    {
        public IFormFile file { get; set; }
        public string sourceLang { get; set; } = "ja"; // Japanese
        public string targetLang { get; set; } = "en"; // English
    }
}