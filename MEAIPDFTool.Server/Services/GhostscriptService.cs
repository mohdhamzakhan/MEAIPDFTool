using Microsoft.AspNetCore.Components.Forms;
using System.Diagnostics;

namespace MEAIPDFTool.Server.Services
{
    public class GhostscriptService
    {
        private readonly string _ghostscriptPath;
        public GhostscriptService(IConfiguration configuration)
        {
            _ghostscriptPath = configuration["GhostscriptPath"] ?? "gswin64c.exe";
        }
        public async Task<string> CompressPdfAsync(
    string inputFilePath,
    string outputFilePath,
    string quality = "screen")
        {
            var arguments =
                $"-dBATCH -dNOPAUSE -q -sDEVICE=pdfwrite " +
                $"-dPDFSETTINGS=/{quality} " +
                $"-sOutputFile=\"{outputFilePath}\" \"{inputFilePath}\"";

            var processStartInfo = new ProcessStartInfo
            {
                FileName = _ghostscriptPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };

            // 🔥 REQUIRED
            if (!process.Start())
                throw new InvalidOperationException("Failed to start Ghostscript process.");

            // Read streams BEFORE wait to avoid deadlocks
            var errorTask = process.StandardError.ReadToEndAsync();
            var outputTask = process.StandardOutput.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                var errorOutput = await errorTask;
                throw new Exception($"Ghostscript compression failed: {errorOutput}");
            }

            return outputFilePath;
        }

        public async Task RunGhostScript(string pdfPath, string outputDir)
        {
            Directory.CreateDirectory(outputDir);

            var args =
                $"-dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m " +
                $"-r300 -sOutputFile=\"{outputDir}/page_%03d.png\" \"{pdfPath}\"";
            var processStartInfo = new ProcessStartInfo
            {
                FileName = _ghostscriptPath,
                Arguments = args,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };

            // 🔥 REQUIRED
            if (!process.Start())
                throw new InvalidOperationException("Failed to start Ghostscript process.");

            // Read streams BEFORE wait to avoid deadlocks
            var errorTask = process.StandardError.ReadToEndAsync();
            var outputTask = process.StandardOutput.ReadToEndAsync();

            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                var errorOutput = await errorTask;
                throw new Exception($"Ghostscript compression failed: {errorOutput}");
            }
        }
    }
}
