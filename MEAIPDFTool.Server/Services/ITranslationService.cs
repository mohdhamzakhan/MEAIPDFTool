namespace MEAIPDFTool.Server.Services
{
    public interface ITranslationService
    {
        Task<string> TranslateTextAsync(string text, string sourceLang, string targetLang);
        Task<(byte[] Content, string Extension)> TranslateFileAsync(
    Stream fileStream, string fileName, string sourceLang, string targetLang,
    CancellationToken ct = default);

    }
}