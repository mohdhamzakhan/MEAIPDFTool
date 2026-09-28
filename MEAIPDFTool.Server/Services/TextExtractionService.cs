using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using System.Text;
using UglyToad.PdfPig;

namespace PDFToolsAPI.Services;

public class TextExtractionService
{
    public async Task<string> ExtractTextFromPdfAsync(IFormFile file)
    {
        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        ms.Position = 0;

        using var document = UglyToad.PdfPig.PdfDocument.Open(ms);
        var sb = new StringBuilder();

        // Flag to track if we found ANY real text in the whole document
        bool hasActualText = false;

        foreach (var page in document.GetPages())
        {
            var pageText = page.Text?.Trim();

            // Only append the page header and text if there's actually text on this page
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                sb.AppendLine($"--- Page {page.Number} ---");
                sb.AppendLine(pageText);
                sb.AppendLine();

                hasActualText = true;
            }
        }

        // If no actual text was found in the entire document, return an empty string.
        // This allows your Controller's OCR fallback logic to trigger flawlessly.
        if (!hasActualText)
        {
            return string.Empty;
        }

        return sb.ToString();
    }


    public async Task<List<string>> ExtractImagesFromPdfAsync(IFormFile file, string outputFolder)
    {
        var extractedImages = new List<string>();

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            stream.Position = 0;

            using var document = PdfReader.Open(stream, PdfDocumentOpenMode.Import);

            Directory.CreateDirectory(outputFolder);

            for (int pageIndex = 0; pageIndex < document.PageCount; pageIndex++)
            {
                var page = document.Pages[pageIndex];

                // Access resources using Elements property
                if (page.Elements.ContainsKey("/Resources"))
                {
                    var resources = page.Elements.GetDictionary("/Resources");

                    if (resources != null && resources.Elements.ContainsKey("/XObject"))
                    {
                        var xObjects = resources.Elements.GetDictionary("/XObject");

                        if (xObjects != null)
                        {
                            foreach (var name in xObjects.Elements.Keys)
                            {
                                var xObject = xObjects.Elements.GetObject(name);

                                if (xObject is PdfDictionary dict)
                                {
                                    // Check if it's an image using Elements property
                                    if (dict.Elements.ContainsKey("/Subtype"))
                                    {
                                        var subtype = dict.Elements.GetName("/Subtype");
                                        if (subtype == "/Image")
                                        {
                                            var imagePath = Path.Combine(outputFolder,
                                                $"image_p{pageIndex + 1}_{name.Replace("/", "")}.png");
                                            extractedImages.Add(imagePath);

                                            // Extract image data if available
                                            if (dict.Stream != null)
                                            {
                                                var imageData = dict.Stream.Value;
                                                await File.WriteAllBytesAsync(imagePath, imageData);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error extracting images: {ex.Message}");
        }

        return extractedImages;
    }
}
