namespace MEAIPDFTool.Server.Services
{
    public interface IPdfConversionService
    {
        Task<string> ConvertPdfToWordAsync(IFormFile pdfFile, string outputPath);
        Task<string> ConvertPdfToExcelAsync(IFormFile pdfFile, string outputPath);
        Task<string> ConvertPdfToTextAsync(IFormFile pdfFile, string outputPath);
    }
}
