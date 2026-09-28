namespace MEAIPDFTool.Server.Models
{
    public class PdfOperationRequest
    {
    }

    public class SplitRequest
    {
        public int StartPage { get; set; }
        public int EndPage { get; set; }
    }

    public class PasswordRequest
    {
        public string UserPassword { get; set; } = string.Empty;
        public string OwnerPassword { get; set; } = string.Empty;
    }
}
