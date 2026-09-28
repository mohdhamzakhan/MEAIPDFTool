import React, { useState } from 'react';
import { pdfService } from '../services/pdfService';

const ConvertPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [format, setFormat] = useState<'word' |'excel'>('word');
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleConvert = async () => {
        if (!file) {
            setResult('Please select a PDF file');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await pdfService.covertPdf(file,format);
            if (response.success && response.fileName) {
                setResult('Text extracted successfully!');
                pdfService.downloadFile(response.fileName);
            }
            else {
                setResult('Error: ' + response.message);
            }
        }
        catch (error: any) {
            setResult('Error: ' + error.message);
        }
        finally {
            setLoading(false);
        }
    }
    return (
        <div className="tool-container">
            <h2>Convert PDF to Word or Excel</h2>
            <div className="upload-section">
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                {file && <p>{file.name}</p>}
            </div>
            <div className="input-group">
                <label>
                    Convert to:
                    <select value={format} onChange={(e) => setFormat(e.target.value as 'word' | 'excel')}>
                        <option value="word">Word Document</option>
                        <option value="excel">Excel Spreadsheet</option>
                    </select>
                </label>
            </div>
            <button onClick={handleConvert} disabled={loading || !file}>
                {loading ? 'Converting...' : 'Convert PDF'}
            </button>
            {result && <p className="result">{result}</p>}
        </div>
    );
};

export default ConvertPdf;