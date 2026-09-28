import React, { useState } from 'react';
import { pdfService } from '../services/pdfService';

const ExtractText: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<string>('');
    const [extractedText, setExtractedText] = useState<string>('');
    const [extractMode, setExtractMode] = useState<'pdf' | 'image'>('pdf');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleExtract = async () => {
        if (!file) {
            setResult('Please select a file');
            return;
        }

        setLoading(true);
        setResult('');
        setExtractedText('');

        try {
            let response;

            switch (extractMode) {
                case 'image':
                    response = await pdfService.ocrImage(file);
                    break;
                case 'pdf':
                    response = await pdfService.extractText(file);
                    break;
                default:
                    setResult('Invalid extraction mode');
                    return;
            }

            console.log('Backend Response:', response);

            if (response.success) {
                setResult(`Text extracted successfully from ${extractMode.toUpperCase()}!`);

                // 🔍 DEBUG: Check if extractedText exists
                console.log('Extracted Text:', response.extractedText);

                if (response.extractedText) {
                    setExtractedText(response.extractedText);
                } else {
                    console.error('No extractedText in response');
                    setResult('Text extracted but content not available');
                }
            } else {
                setResult(response.message || 'Text extraction failed');
            }
        } catch (error: any) {
            console.error(error);
            setResult(
                error?.response?.data?.message ||
                error?.message ||
                'Something went wrong'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (extractedText) {
            const blob = new Blob([extractedText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `extracted_text_${Date.now()}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    const lineCount = extractedText.split('\n').length;

    return (
        <div className="tool-container">
            <h2>Extract Text</h2>
            <div className="upload-section">
                <input
                    type="file"
                    accept={extractMode === 'pdf' ? '.pdf' : 'image/*'}
                    onChange={handleFileChange}
                />
                {file && <p>{file.name}</p>}
            </div>

            <div className="input-group">
                <label>
                    Extract From:
                    <select value={extractMode} onChange={(e) => setExtractMode(e.target.value as 'pdf' | 'image')}>
                        <option value="pdf">PDF Document</option>
                        <option value="image">Image (OCR)</option>
                    </select>
                </label>
            </div>

            <div className="conversion-info">
                {extractMode === 'pdf' && (
                    <p className="info-text">
                        📄 Extract all text content from PDF pages
                    </p>
                )}
                {extractMode === 'image' && (
                    <p className="info-text">
                        🖼️ Extract text from image using OCR (Optical Character Recognition)
                    </p>
                )}
            </div>

            <button onClick={handleExtract} disabled={loading || !file}>
                {loading ? 'Extracting...' : `Extract Text from ${extractMode.toUpperCase()}`}
            </button>

            {result && <p className={`result ${result.includes('successfully') ? 'success' : result.includes('Error') ? 'error' : ''}`}>
                {result}
            </p>}

            {extractedText && (
                <div className="extracted-content">
                    <div className="content-header">
                        <h3>Extracted Text</h3>
                        <button className="download-btn" onClick={handleDownload}>
                            📥 Download TXT
                        </button>
                    </div>
                    <textarea
                        readOnly
                        value={extractedText}
                        className="extracted-textarea"
                    />
                    <div className="text-stats">
                        <p><strong>Characters:</strong> {extractedText.length}</p>
                        <p><strong>Words:</strong> {wordCount}</p>
                        <p><strong>Lines:</strong> {lineCount}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtractText;
