
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace MEAIPDFTool.Server.Services
{   
    public class PDFService : IPdfService
    {
        public async Task<string> MergePdfsAsync(List<IFormFile> files, string outputPath)
        {
            using var outputDocument = new PdfDocument();

            foreach (var file in files)
            {
                using var stream = new MemoryStream();
                await file.CopyToAsync(stream);
                stream.Position = 0;

                using var inputDocumnet = PdfReader.Open(stream, PdfDocumentOpenMode.Import);

                for (int i = 0; i < inputDocumnet.PageCount; i++)
                {
                    outputDocument.AddPage(inputDocumnet.Pages[i]);
                }
            }
            outputDocument.Save(outputPath);
            return outputPath;
        }

        public async Task<string> ProtectPdfAsync(IFormFile file, string userPassword, string ownerPassword, string outputFile, bool printRequired = true)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var document = PdfReader.Open(stream, PdfDocumentOpenMode.Modify);
            var securitySettings = document.SecuritySettings;
            securitySettings.UserPassword = userPassword;
            securitySettings.OwnerPassword = ownerPassword;
            securitySettings.PermitExtractContent = false;
            securitySettings.PermitAnnotations = false;
            securitySettings.PermitAssembleDocument = false;
            securitySettings.PermitExtractContent = false;
            securitySettings.PermitFormsFill = true;
            securitySettings.PermitFullQualityPrint = false;
            securitySettings.PermitModifyDocument = false;
            securitySettings.PermitPrint = printRequired;

            document.Save(outputFile);
            return outputFile;
        }

        public async Task<string> SplitPdfAsync(IFormFile file, int startPage, int endPage, string outputFile)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var inputDocument = PdfReader.Open(stream, PdfDocumentOpenMode.Import);
            using var outputDocument = new PdfDocument();

            if (startPage < 1 || endPage > inputDocument.PageCount || startPage > endPage)
            {
                throw new ArgumentOutOfRangeException($"Invalid page range. PDF has {inputDocument.PageCount} pages.");
            }

            for (int i = startPage - 1; i < endPage; i++)
            {
                outputDocument.AddPage(inputDocument.Pages[i]);
            }

            outputDocument.Save(outputFile);
            return outputFile;
        }

        // Split all pages individually (equivalent to checkbox1 in original code)
        public async Task<List<string>> SplitAllPagesAsync(IFormFile file, string outputDirectory, string baseFileName)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var inputDocument = PdfReader.Open(stream, PdfDocumentOpenMode.Import);
            var outputFiles = new List<string>();

            for (int i = 0; i < inputDocument.PageCount; i++)
            {
                using var outputDocument = new PdfDocument();
                outputDocument.AddPage(inputDocument.Pages[i]);

                var outputFile = Path.Combine(outputDirectory, $"{baseFileName}_{i + 1}.pdf");
                outputDocument.Save(outputFile);
                outputFiles.Add(outputFile);
            }

            return outputFiles;
        }

        // Split by page selections (e.g., "1,2-3,5-7") - equivalent to textBox1 in original code
        public async Task<List<string>> SplitBySelectionAsync(IFormFile file, string pageSelection, string outputDirectory, string baseFileName)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var inputDocument = PdfReader.Open(stream, PdfDocumentOpenMode.Import);
            var outputFiles = new List<string>();

            // Parse page selection (e.g., "1,2-3,5-7")
            var selections = pageSelection.Split(',', StringSplitOptions.RemoveEmptyEntries);

            foreach (var selection in selections)
            {
                using var outputDocument = new PdfDocument();

                if (selection.Contains("-"))
                {
                    // Range: "2-5"
                    var parts = selection.Split('-');
                    int start = int.Parse(parts[0].Trim());
                    int end = int.Parse(parts[1].Trim());

                    if (start < 1 || end > inputDocument.PageCount || start > end)
                    {
                        throw new ArgumentOutOfRangeException($"Invalid page range: {selection}");
                    }

                    for (int i = start - 1; i < end; i++)
                    {
                        outputDocument.AddPage(inputDocument.Pages[i]);
                    }

                    var outputFile = Path.Combine(outputDirectory, $"{baseFileName}_{selection}.pdf");
                    outputDocument.Save(outputFile);
                    outputFiles.Add(outputFile);
                }
                else
                {
                    // Single page: "3"
                    int pageNum = int.Parse(selection.Trim());

                    if (pageNum < 1 || pageNum > inputDocument.PageCount)
                    {
                        throw new ArgumentOutOfRangeException($"Invalid page number: {pageNum}");
                    }

                    outputDocument.AddPage(inputDocument.Pages[pageNum - 1]);

                    var outputFile = Path.Combine(outputDirectory, $"{baseFileName}_{pageNum}.pdf");
                    outputDocument.Save(outputFile);
                    outputFiles.Add(outputFile);
                }
            }

            return outputFiles;
        }

        // Get page count from uploaded file
        public async Task<int> GetPageCountAsync(IFormFile file)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var inputDocument = PdfReader.Open(stream, PdfDocumentOpenMode.Import);
            return inputDocument.PageCount;
        }

    }
}
