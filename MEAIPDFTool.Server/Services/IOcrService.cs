namespace MEAIPDFTool.Server.Services
{
    public interface IOcrService
    {
        Task<string> ExtractTextFromImageAsync(string imagePath, string sourceLang = "en");
        Task<List<string>> ExtractTextFromMultipleImagesAsync(List<string> imagePaths, string sourceLang = "en");
    }
}
