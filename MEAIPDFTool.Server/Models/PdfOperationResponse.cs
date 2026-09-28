namespace MEAIPDFTool.Server.Models
{
    public class PdfOperationResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? FilePath { get; set; }
        public string? FileName { get; set; }
        public List<FileInfoSplit> Files { get; set; }
    }

    public class FileInfoSplit
    {
        public string FileName { get; set; }
        public string FilePath { get; set; }
    }

}
