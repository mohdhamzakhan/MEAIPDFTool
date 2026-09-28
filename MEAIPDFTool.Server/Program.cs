using MEAIPDFTool.Server.Models;
using MEAIPDFTool.Server.Services;
using PDFToolsAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddScoped<IPdfService, PDFService>();
builder.Services.AddScoped<IPdfEditService, PdfEditService>();
builder.Services.AddScoped<IPdfConversionService, PdfConversionService>();
builder.Services.AddScoped<TextExtractionService>();
builder.Services.AddScoped<IOcrService, OcrService>();
builder.Services.AddSingleton<GhostscriptService>();


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .WithOrigins(
                "https://localhost:60320",
                "http://localhost:3000",
                "http://10.235.20.49:5296",
                "http://10.235.20.49:5294"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddHttpClient<ITranslationService, TranslationService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30); // ✅ Best place
});
builder.Services.AddScoped<ITranslationService, TranslationService>();

//builder.Services.AddSingleton<ITranslatorService>(sp =>
//    new OnnxTranslator(
//        $"/Python/models/encoder_model.onnx",
//        $"/Python/models/decoder_model.onnx",
//        $"/Python/models/ja_vocab.txt",
//        $"/Python/models/en_vocab.txt"

//    )
//);


var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

Directory.CreateDirectory(Path.Combine(app.Environment.WebRootPath, "temp"));

app.Run();
