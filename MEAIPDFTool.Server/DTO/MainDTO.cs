using System.ComponentModel.DataAnnotations;

namespace MEAIPDFTool.Server.DTO
{
    public class MainDTO
    {
    }
    public class SplitPdfRequest
    {
        [Required]
        public IFormFile File { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int StartPage { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int EndPage { get; set; }
    }

    public class SplitAllPagesRequest
    {
        [Required]
        public IFormFile File { get; set; }
    }

    public class SplitBySelectionRequest
    {
        [Required]
        public IFormFile File { get; set; }

        [Required]
        public string PageSelection { get; set; } // e.g., "1,2-3,5-7"
    }

    public class ProtectPdfRequest
    {
        [Required]
        public IFormFile file { get; set; }

        [Required]
        public string userPassword { get; set; }

        [Required]
        public string ownerPassword { get; set; }

        [Required]
        public Boolean enablePrint { get; set; }
    }

    public class CompressPdfRequest
    {
        [Required]
        public IFormFile file { get; set; }
        [Required]
        public string quality { get; set; } = "ebook";
    }

    public class GetPdfFileRequest
    {
        [Required]
        public IFormFile file { get; set; }
    }

    public class AddTextPdfRequest
    {
        [Required]
        public IFormFile file { get; set; }
        [Required]
        public string textItems { get; set; } // JSON string of TextItem[]
    }

    public class TextItem
    {
        public string Text { get; set; }
        public float X { get; set; }
        public float Y { get; set; }
        public int FontSize { get; set; }
        public string FontFamily { get; set; }
        public int Page { get; set; }
    }

    public class AddWaterMarkPdfRequest
    {
        [Required]
        public IFormFile file { get; set; }
        [Required]
        public string watermarkText { get; set; }
    }

    public class RemovePdfPageRequest
    {
        [Required]
        public IFormFile file { get; set; }
        public int pageNumber { get; set; }
    }

    public class RotatePdfPageRequest
    {

        [Required]
        public IFormFile file { get; set; }
        [Required]
        public string pageNumbers { get; set; }
        [Required]
        public int angle { get; set; }
    }
}
