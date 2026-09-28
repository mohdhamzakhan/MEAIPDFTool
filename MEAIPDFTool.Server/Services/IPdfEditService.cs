using MEAIPDFTool.Server.DTO;

namespace MEAIPDFTool.Server.Services
{
    public interface IPdfEditService
    {
        Task<string> AddTextToPdfAsync(IFormFile pdfFile, List<TextItem> textItems, string outputPath);
        Task<string> RemovePageAsync(IFormFile pdfFile, int pageNumber, string outputPath);
        Task<string> RotatePagesAsync(IFormFile pdfFile, int[] pageNumbers, int rotationAngle, string outputPath);
        Task<string> AddWatermarkAsync(IFormFile pdfFile, string watermarkText, string outputPath);
    }
}
