using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using MEAIPDFTool.Server.Services;
using NPOI.XSSF.UserModel;
using System.Text;
using UglyToad.PdfPig;
namespace PDFToolsAPI.Services;

public class PdfConversionService : IPdfConversionService
{
    private readonly GhostscriptService _ghostscriptService;
    public PdfConversionService(GhostscriptService ghostscriptService)
    {
        _ghostscriptService = ghostscriptService;
    }
    public async Task<string> ConvertPdfToWordAsync(IFormFile pdfFile, string outputPath)
    {
        using var ms = new MemoryStream();
        await pdfFile.CopyToAsync(ms);
        ms.Position = 0;

        using var pdf = PdfDocument.Open(ms);
        using var wordDoc = WordprocessingDocument.Create(outputPath, WordprocessingDocumentType.Document);

        var mainPart = wordDoc.AddMainDocumentPart();
        mainPart.Document = new Document(new Body());
        var body = mainPart.Document.Body;

        foreach (var page in pdf.GetPages())
        {
            var contentBlocks = ExtractContentBlocks(page);

            foreach (var block in contentBlocks)
            {
                var paragraph = new Paragraph();
                var paragraphProperties = new ParagraphProperties();

                // Apply alignment based on X position
                if (block.Alignment == TextAlignment.Center)
                {
                    paragraphProperties.AppendChild(new Justification { Val = JustificationValues.Center });
                }
                else if (block.Alignment == TextAlignment.Right)
                {
                    paragraphProperties.AppendChild(new Justification { Val = JustificationValues.Right });
                }

                paragraph.AppendChild(paragraphProperties);

                foreach (var textRun in block.TextRuns)
                {
                    var run = new Run();
                    var runProperties = new RunProperties();

                    // Font size
                    if (textRun.FontSize > 0)
                    {
                        runProperties.AppendChild(new FontSize { Val = ((int)(textRun.FontSize * 2)).ToString() });
                    }

                    // Bold detection
                    if (textRun.IsBold)
                    {
                        runProperties.AppendChild(new Bold());
                    }

                    // Font family
                    if (!string.IsNullOrEmpty(textRun.FontFamily))
                    {
                        runProperties.AppendChild(new RunFonts { Ascii = textRun.FontFamily });
                    }

                    run.AppendChild(runProperties);
                    run.AppendChild(new Text(textRun.Text) { Space = SpaceProcessingModeValues.Preserve });
                    paragraph.AppendChild(run);
                }

                body.AppendChild(paragraph);
            }

            // Page break
            if (page.Number < pdf.NumberOfPages)
            {
                body.AppendChild(new Paragraph(new Run(new Break { Type = BreakValues.Page })));
            }
        }

        mainPart.Document.Save();
        return outputPath;
    }

    // Helper classes and methods
    public class ContentBlock
    {
        public List<TextRun> TextRuns { get; set; } = new();
        public TextAlignment Alignment { get; set; }
        public double YPosition { get; set; }
    }

    public class TextRun
    {
        public string Text { get; set; }
        public double FontSize { get; set; }
        public bool IsBold { get; set; }
        public string FontFamily { get; set; }
    }

    public enum TextAlignment
    {
        Left,
        Center,
        Right
    }

    private List<ContentBlock> ExtractContentBlocks(UglyToad.PdfPig.Content.Page page)
    {
        var blocks = new List<ContentBlock>();
        var pageWidth = page.Width;
        var letters = page.Letters.ToList();

        // Group letters into words, then lines, then blocks
        var lines = page.GetWords()
            .GroupBy(w => Math.Round(w.BoundingBox.Bottom, 1))
            .OrderByDescending(g => g.Key)
            .ToList();

        foreach (var line in lines)
        {
            var block = new ContentBlock { YPosition = line.Key };
            var orderedWords = line.OrderBy(w => w.BoundingBox.Left).ToList();

            // Detect alignment
            var firstWordX = orderedWords.First().BoundingBox.Left;
            var lastWordX = orderedWords.Last().BoundingBox.Right;
            var lineWidth = lastWordX - firstWordX;
            var centerX = (firstWordX + lastWordX) / 2;
            var pageCenterX = pageWidth / 2;

            if (Math.Abs(centerX - pageCenterX) < 50 && firstWordX > 100)
            {
                block.Alignment = TextAlignment.Center;
            }
            else if (lastWordX > pageWidth - 100 && firstWordX > pageWidth / 2)
            {
                block.Alignment = TextAlignment.Right;
            }
            else
            {
                block.Alignment = TextAlignment.Left;
            }

            // Create text runs with formatting
            foreach (var word in orderedWords)
            {
                // Get letters for this word
                var wordLetters = letters.Where(l =>
                    l.Location.X >= word.BoundingBox.Left &&
                    l.Location.X <= word.BoundingBox.Right &&
                    Math.Abs(l.Location.Y - word.BoundingBox.Bottom) < 3
                ).ToList();

                var textRun = new TextRun
                {
                    Text = word.Text + " "
                };

                if (wordLetters.Any())
                {
                    textRun.FontSize = wordLetters.Average(l => l.FontSize);
                    var fontName = wordLetters.First().FontName ?? "";
                    textRun.FontFamily = fontName.Split('-').FirstOrDefault() ?? "Calibri";
                    textRun.IsBold = fontName.Contains("Bold", StringComparison.OrdinalIgnoreCase);
                }

                block.TextRuns.Add(textRun);
            }

            if (block.TextRuns.Any())
            {
                blocks.Add(block);
            }
        }

        return blocks;
    }

    public async Task<string> ConvertPdfToExcelAsync(IFormFile pdfFile, string outputPath)
    {
        using var ms = new MemoryStream();
        await pdfFile.CopyToAsync(ms);
        ms.Position = 0;

        using var pdf = PdfDocument.Open(ms);
        var workbook = new XSSFWorkbook();
        var sheet = workbook.CreateSheet("Extracted Data");

        int rowIndex = 0;

        foreach (var page in pdf.GetPages())
        {
            var tableData = ExtractTableData(page);

            foreach (var row in tableData)
            {
                var excelRow = sheet.CreateRow(rowIndex++);

                for (int colIndex = 0; colIndex < row.Count; colIndex++)
                {
                    var cell = excelRow.CreateCell(colIndex);
                    cell.SetCellValue(row[colIndex]);

                    // Try to detect and apply number formatting
                    if (double.TryParse(row[colIndex].Replace(",", "").Replace("$", ""), out double numValue))
                    {
                        cell.SetCellValue(numValue);

                        if (row[colIndex].Contains("$"))
                        {
                            var cellStyle = workbook.CreateCellStyle();
                            cellStyle.DataFormat = workbook.CreateDataFormat().GetFormat("$#,##0.00");
                            cell.CellStyle = cellStyle;
                        }
                    }
                }
            }

            rowIndex++; // spacing between pages
        }

        // Auto-size columns
        for (int i = 0; i < 20; i++)
        {
            try
            {
                sheet.AutoSizeColumn(i);
            }
            catch { break; }
        }

        using var fs = new FileStream(outputPath, FileMode.Create);
        workbook.Write(fs);

        return outputPath;
    }

    private List<List<string>> ExtractTableData(UglyToad.PdfPig.Content.Page page)
    {
        var words = page.GetWords().ToList();

        // Detect column positions
        var xPositions = words.Select(w => Math.Round(w.BoundingBox.Left, 0)).Distinct().OrderBy(x => x).ToList();
        var columnThreshold = 15; // pixels
        var columns = new List<double> { xPositions.First() };

        foreach (var x in xPositions.Skip(1))
        {
            if (x - columns.Last() > columnThreshold)
            {
                columns.Add(x);
            }
        }

        // Group words by rows
        var rows = words
            .GroupBy(w => Math.Round(w.BoundingBox.Bottom, 1))
            .OrderByDescending(g => g.Key)
            .ToList();

        var result = new List<List<string>>();

        foreach (var row in rows)
        {
            var rowData = new List<string>(new string[columns.Count]);

            foreach (var word in row)
            {
                // Find which column this word belongs to
                var colIndex = 0;
                for (int i = 0; i < columns.Count; i++)
                {
                    if (word.BoundingBox.Left >= columns[i] - columnThreshold)
                    {
                        colIndex = i;
                    }
                }

                if (string.IsNullOrEmpty(rowData[colIndex]))
                {
                    rowData[colIndex] = word.Text;
                }
                else
                {
                    rowData[colIndex] += " " + word.Text;
                }
            }

            // Only add rows that have content
            if (rowData.Any(cell => !string.IsNullOrWhiteSpace(cell)))
            {
                result.Add(rowData);
            }
        }

        return result;
    }

    public async Task<string> ConvertPdfToTextAsync(IFormFile pdfFile, string outputPath)
    {
        using var ms = new MemoryStream();
        await pdfFile.CopyToAsync(ms);
        ms.Position = 0;

        using var pdf = PdfDocument.Open(ms);
        var sb = new StringBuilder();

        foreach (var page in pdf.GetPages())
        {
            sb.AppendLine($"--- Page {page.Number} ---");
            sb.AppendLine(page.Text);
            sb.AppendLine();
        }

        await File.WriteAllTextAsync(outputPath, sb.ToString());
        return outputPath;
    }
}
