using MEAIPDFTool.Server.DTO;
using MEAIPDFTool.Server.Models;
using MEAIPDFTool.Server.Services;
using Microsoft.AspNetCore.Mvc;
using NPOI.HSSF.Util;
using PDFToolsAPI.Services;
using System.Text.Json;


namespace PDFToolsAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PdfController : ControllerBase
{
    private readonly IPdfService _pdfService;
    private readonly IPdfEditService _pdfEditService;
    private readonly IPdfConversionService _conversionService;
    private readonly TextExtractionService _textExtractionService;
    private readonly IOcrService _ocrService;
    private readonly GhostscriptService _ghostscriptService;
    private readonly IWebHostEnvironment _environment;
  

    public PdfController(IPdfService pdfService,
        IPdfEditService pdfEditService,
        IPdfConversionService conversionService,
        TextExtractionService textExtractionService,
        IOcrService ocrService,
        GhostscriptService ghostscriptService,
        IWebHostEnvironment environment)
    {
        _pdfService = pdfService;
        _pdfEditService = pdfEditService;
        _conversionService = conversionService;
        _textExtractionService = textExtractionService;
        _ocrService = ocrService;
        _ghostscriptService = ghostscriptService;
        _environment = environment;
    }

    [HttpPost("merge")]
    public async Task<IActionResult> MergePdfs([FromForm] List<IFormFile> files)
    {
        try
        {
            if (files == null || files.Count < 2)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "At least 2 files required" });

            var outputFileName = $"merged_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfService.MergePdfsAsync(files, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "PDFs merged successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("split")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SplitPdf([FromForm] SplitPdfRequest request)
    {
        try
        {
            if (request.File == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"split_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfService.SplitPdfAsync(request.File, request.StartPage, request.EndPage, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = $"PDF split successfully (pages {request.StartPage}-{request.EndPage})",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new PdfOperationResponse { Success = false, Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    // Split all pages individually
    [HttpPost("split-all")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SplitAllPages([FromForm] SplitAllPagesRequest request)
    {
        try
        {
            if (request.File == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var baseFileName = $"split_{Guid.NewGuid()}";
            var outputDirectory = Path.Combine(_environment.WebRootPath, "temp");

            var outputFiles = await _pdfService.SplitAllPagesAsync(request.File, outputDirectory, baseFileName);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = $"PDF split into {outputFiles.Count} individual pages",
                Files = outputFiles.Select(f => new FileInfoSplit
                {
                    FileName = Path.GetFileName(f),
                    FilePath = $"/temp/{Path.GetFileName(f)}"
                }).ToList()
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    // Split by page selection (e.g., "1,2-3,5-7")
    [HttpPost("split-selection")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SplitBySelection([FromForm] SplitBySelectionRequest request)
    {
        try
        {
            if (request.File == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            if (string.IsNullOrWhiteSpace(request.PageSelection))
                return BadRequest(new PdfOperationResponse { Success = false, Message = "Page selection is required (e.g., '1,2-3,5-7')" });

            var baseFileName = $"split_{Guid.NewGuid()}";
            var outputDirectory = Path.Combine(_environment.WebRootPath, "temp");

            var outputFiles = await _pdfService.SplitBySelectionAsync(
                request.File,
                request.PageSelection,
                outputDirectory,
                baseFileName);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = $"PDF split into {outputFiles.Count} files based on selection: {request.PageSelection}",
                Files = outputFiles.Select(f => new FileInfoSplit
                {
                    FileName = Path.GetFileName(f),
                    FilePath = $"/temp/{Path.GetFileName(f)}"
                }).ToList()
            });
        }
        catch (ArgumentOutOfRangeException ex)
        {
            return BadRequest(new PdfOperationResponse { Success = false, Message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    // Get PDF page count
    [HttpPost("page-count")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> GetPageCount([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new { Success = false, Message = "File is required" });

            var pageCount = await _pdfService.GetPageCountAsync(request.file);

            return Ok(new { Success = true, PageCount = pageCount });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("protect")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ProtectPdf([FromForm] ProtectPdfRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"protected_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfService.ProtectPdfAsync(request.file, request.userPassword, request.ownerPassword, outputPath, request.enablePrint);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "PDF protected successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("compress")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> CompressPdf([FromForm] CompressPdfRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var tempInput = Path.Combine(_environment.WebRootPath, "temp", $"input_{Guid.NewGuid()}.pdf");
            var outputFileName = $"compressed_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            using (var stream = new FileStream(tempInput, FileMode.Create))
            {
                await request.file.CopyToAsync(stream);
            }

            await _ghostscriptService.CompressPdfAsync(tempInput, outputPath, request.quality);
            System.IO.File.Delete(tempInput);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "PDF compressed successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("extract-text")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ExtractText([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new { success = false, message = "File is required" });

            var extractedText = await _textExtractionService.ExtractTextFromPdfAsync(request.file);

            var outputFileName = $"extracted_{Guid.NewGuid()}.txt";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await System.IO.File.WriteAllTextAsync(outputPath, extractedText);

            return Ok(new
            {
                success = true,
                message = "Text extracted successfully",
                fileName = outputFileName,
                filePath = $"/temp/{outputFileName}",
                extractedText = extractedText // ← ADD THIS LINE
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }


    [HttpPost("extract-images")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ExtractImages([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var tempFolder = Path.Combine(_environment.WebRootPath, "temp", $"images_{Guid.NewGuid()}");
            var images = await _textExtractionService.ExtractImagesFromPdfAsync(request.file, tempFolder);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = $"Extracted {images.Count} images",
                FileName = tempFolder,
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }
    [HttpPost("ocr-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> OcrImage([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new { success = false, message = "File is required" });

            var tempImagePath = Path.Combine(_environment.WebRootPath, "temp", $"{Guid.NewGuid()}_{request.file.FileName}");

            using (var stream = new FileStream(tempImagePath, FileMode.Create))
            {
                await request.file.CopyToAsync(stream);
            }

            var extractedText = await _ocrService.ExtractTextFromImageAsync(tempImagePath);

            var outputFileName = $"ocr_result_{Guid.NewGuid()}.txt";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await System.IO.File.WriteAllTextAsync(outputPath, extractedText);

            System.IO.File.Delete(tempImagePath);

            return Ok(new
            {
                success = true,
                message = "OCR completed successfully",
                fileName = outputFileName,
                filePath = $"/temp/{outputFileName}",
                extractedText = extractedText // ← ADD THIS LINE
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("convert-to-word")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ConvertToWord([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"converted_{Guid.NewGuid()}.docx";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _conversionService.ConvertPdfToWordAsync(request.file, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "PDF converted to Word successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("convert-to-excel")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ConvertToExcel([FromForm] GetPdfFileRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"converted_{Guid.NewGuid()}.xlsx";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _conversionService.ConvertPdfToExcelAsync(request.file, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "PDF converted to Excel successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }
    [HttpPost("add-text")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddText([FromForm] AddTextPdfRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };


            var textItems = JsonSerializer.Deserialize<List<TextItem>>(
     request.textItems,
     options
 );

            var outputFileName = $"edited_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfEditService.AddTextToPdfAsync(request.file, textItems, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "Text added to PDF successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }
    [HttpPost("add-watermark")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AddWatermark([FromForm] AddWaterMarkPdfRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"watermarked_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfEditService.AddWatermarkAsync(request.file, request.watermarkText, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "Watermark added successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("remove-page")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> RemovePage([FromForm] RemovePdfPageRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var outputFileName = $"edited_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfEditService.RemovePageAsync(request.file, request.pageNumber, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = $"Page {request.pageNumber} removed successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("rotate-pages")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> RotatePages([FromForm] RotatePdfPageRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            var pages = request.pageNumbers.Split(',').Select(p => int.Parse(p.Trim())).ToArray();
            var outputFileName = $"rotated_{Guid.NewGuid()}.pdf";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);

            await _pdfEditService.RotatePagesAsync(request.file, pages, request.angle, outputPath);

            return Ok(new PdfOperationResponse
            {
                Success = true,
                Message = "Pages rotated successfully",
                FileName = outputFileName,
                FilePath = $"/temp/{outputFileName}"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new PdfOperationResponse { Success = false, Message = ex.Message });
        }
    }

    [HttpGet("download/{filename}")]
    public IActionResult DownloadFile(string filename)
    {
        var filePath = Path.Combine(_environment.WebRootPath, "temp", filename);

        if (!System.IO.File.Exists(filePath))
            return NotFound();

        var memory = new MemoryStream();
        using (var stream = new FileStream(filePath, FileMode.Open))
        {
            stream.CopyTo(memory);
        }
        memory.Position = 0;

        return File(memory, "application/pdf", filename);
    }

    [HttpPost("translate")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> TranslatePdf([FromForm] TranslatePdfRequest request)
    {
        try
        {
            if (request.file == null)
                return BadRequest(new PdfOperationResponse { Success = false, Message = "File is required" });

            // Step 1: Extract text from PDF
            var extractedText = await _textExtractionService.ExtractTextFromPdfAsync(request.file);

            // NEW LOGIC: Remove the page headers and whitespace to see if there is actual content
            var cleanTextForCheck = System.Text.RegularExpressions.Regex.Replace(extractedText ?? "", @"--- Page \d+ ---|\s", "");

            // If the cleaned text is empty, it means the PDF is just images/scans. Try OCR!
            if (string.IsNullOrEmpty(cleanTextForCheck))
            {
                var tempImagePath = Path.Combine(_environment.WebRootPath, "temp", $"{Guid.NewGuid()}.pdf");
                using (var stream = new FileStream(tempImagePath, FileMode.Create))
                {
                    await request.file.CopyToAsync(stream);
                }

                // Overwrite the extractedText with the OCR results
                extractedText = await _ocrService.ExtractTextFromImageAsync(tempImagePath);
                System.IO.File.Delete(tempImagePath);
            }

            // Step 2: Translate the extracted text
            var translationService = HttpContext.RequestServices.GetRequiredService<ITranslationService>();
            var translatedText = await translationService.TranslateTextAsync(
                extractedText,
                request.sourceLang,
                request.targetLang
            );

            // Step 3: Save translated text
            var outputFileName = $"translated_{Guid.NewGuid()}.txt";
            var outputPath = Path.Combine(_environment.WebRootPath, "temp", outputFileName);
            await System.IO.File.WriteAllTextAsync(outputPath, translatedText);

            return Ok(new
            {
                success = true,
                message = "PDF translated successfully",
                fileName = outputFileName,
                filePath = $"/temp/{outputFileName}",
                originalText = extractedText,
                translatedText = translatedText
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("text")]
    public async Task<IActionResult> TranslateText([FromBody] TranslateTextRequest request)
    {
        try
        {
            var translationService = HttpContext.RequestServices.GetRequiredService<ITranslationService>();
            var translatedText = await translationService.TranslateTextAsync(
                request.Text,
                request.SourceLang,
                request.TargetLang
            );

            return Ok(new
            {
                success = true,
                message = "Text translated successfully",
                translatedText = translatedText
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    public class TranslateTextRequest
    {
        public string Text { get; set; }
        public string SourceLang { get; set; }
        public string TargetLang { get; set; }
    }
}
