import React, { useState } from 'react';
import { pdfService } from '../services/pdfService';

const CompressPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [quality, setQuality] = useState<string>('ebook');
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleCompress = async () => {
        if (!file) {
            setResult('Please select a PDF file');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            const response = await pdfService.compressPdf(file, quality);
            if (response.success && response.fileName) {
                setResult('PDF compressed successfully!');
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
    };

    return (
        <div className="tool-container">
            <h2>Compress PDF</h2>
            <div className="upload-section">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                />
                {file && <p>{file.name}</p>}
            </div>
            <div className="input-group">
                <label>
                    Quality:
                    <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                        <option value="screen">Low quality</option>
                        <option value="ebook">Medium quality</option>
                        <option value="printer">High quality</option>
                        <option value="prepress">Maximum quality</option>
                    </select>
                </label>
            </div>
            <button onClick={handleCompress} disabled={loading || !file}>
                {loading ? 'Compressing...' : 'Compress PDF'}
            </button>
            {result && <p className="result">{result}</p>}
        </div>
    );
};

export default CompressPdf;