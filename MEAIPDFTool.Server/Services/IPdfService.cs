namespace MEAIPDFTool.Server.Services
{
    public interface IPdfService
    {
        Task<string> MergePdfsAsync(List<IFormFile> files, string outputFile);
        Task<string> ProtectPdfAsync(IFormFile file, string userPassword, string ownerPassword, string outputFile, bool printRequired = true);
        Task<string> SplitPdfAsync(IFormFile file, int startPage, int endPage, string outputFile);
        Task<List<string>> SplitAllPagesAsync(IFormFile file, string outputDirectory, string baseFileName);
        Task<List<string>> SplitBySelectionAsync(IFormFile file, string pageSelection, string outputDirectory, string baseFileName);
        Task<int> GetPageCountAsync(IFormFile file);
    }
}
