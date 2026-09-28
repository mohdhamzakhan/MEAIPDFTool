using MEAIPDFTool.Server.DTO;
using MEAIPDFTool.Server.Services;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf.IO;

namespace PDFToolsAPI.Services;

public class PdfEditService : IPdfEditService
{
    public async Task<string> AddTextToPdfAsync(IFormFile pdfFile, List<TextItem> textItems, string outputPath)
    {
        try
        {
            using var stream = new MemoryStream();
            await pdfFile.CopyToAsync(stream);
            stream.Position = 0;

            using (var document = PdfReader.Open(stream, PdfDocumentOpenMode.Modify))
            {
                // Group text items by page number
                var itemsByPage = textItems.GroupBy(item => item.Page);

                foreach (var pageGroup in itemsByPage)
                {
                    var pageNumber = pageGroup.Key;
                    var page = document.Pages[pageNumber - 1];

                    // Create ONE XGraphics object per page
                    using (var gfx = XGraphics.FromPdfPage(page))
                    {
                        // Draw all text items for this page
                        foreach (var item in pageGroup)
                        {
                            var font = new XFont(item.FontFamily, item.FontSize);
                            gfx.DrawString(item.Text, font, XBrushes.Black,
                                new XRect(item.X, item.Y, page.Width, page.Height),
                                XStringFormats.TopLeft);
                        }
                    } // XGraphics is automatically disposed here
                }

                document.Save(outputPath);
            }
            return outputPath;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error adding text to PDF: {ex.Message}");
        }
    }

    public async Task<string> RemovePageAsync(IFormFile pdfFile, int pageNumber, string outputPath)
    {
        try
        {
            using var stream = new MemoryStream();
            await pdfFile.CopyToAsync(stream);
            stream.Position = 0;

            using (var document = PdfReader.Open(stream, PdfDocumentOpenMode.Modify))
            {
                if (pageNumber < 1 || pageNumber > document.PageCount)
                    throw new ArgumentException($"Invalid page number: {pageNumber}");

                document.Pages.RemoveAt(pageNumber - 1);
                document.Save(outputPath);
            }

            return outputPath;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error removing page: {ex.Message}");
        }
    }

    public async Task<string> RotatePagesAsync(IFormFile pdfFile, int[] pageNumbers, int rotationAngle, string outputPath)
    {
        try
        {
            using var stream = new MemoryStream();
            await pdfFile.CopyToAsync(stream);
            stream.Position = 0;

            using (var document = PdfReader.Open(stream, PdfDocumentOpenMode.Modify))
            {
                foreach (var pageNum in pageNumbers)
                {
                    if (pageNum >= 1 && pageNum <= document.PageCount)
                    {
                        var page = document.Pages[pageNum - 1];
                        page.Rotate += rotationAngle;
                    }
                }

                document.Save(outputPath);
            }

            return outputPath;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error rotating pages: {ex.Message}");
        }
    }

    public async Task<string> AddWatermarkAsync(IFormFile pdfFile, string watermarkText, string outputPath)
    {
        try
        {
            using var stream = new MemoryStream();
            await pdfFile.CopyToAsync(stream);
            stream.Position = 0;

            using (var document = PdfReader.Open(stream, PdfDocumentOpenMode.Modify))
            {
                var font = new XFont("Arial", 60, XFontStyle.BoldItalic);

                foreach (var page in document.Pages)
                {
                    var gfx = XGraphics.FromPdfPage(page, XGraphicsPdfPageOptions.Prepend);

                    gfx.TranslateTransform(page.Width / 2, page.Height / 2);
                    gfx.RotateTransform(-45);

                    gfx.DrawString(watermarkText, font,
                        new XSolidBrush(XColor.FromArgb(128, 200, 200, 200)),
                        0, 0, XStringFormats.Center);
                }

                document.Save(outputPath);
            }

            return outputPath;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error adding watermark: {ex.Message}");
        }
    }
}
