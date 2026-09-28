import React, { useState } from 'react';
import { pdfService } from '../services/pdfService';

const ProtectPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [userPassword, setUserPassword] = useState<string>('');
    const [ownerPassword, setOwnerPassword] = useState<string>('Meai.123456789');
    const [enablePrint, setEnablePrint] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [result, setResult] = useState<string>('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleProtect = async () => {
        if (!file) {
            setResult('Please select a PDF file');
            return;
        }
        if (!userPassword || !ownerPassword) {
            setResult('Please enter both user and owner passwords');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            const response = await pdfService.protectPdf(file, userPassword, ownerPassword, enablePrint);
            if (response.success && response.fileName) {
                setResult('PDF protected successfully!');
                pdfService.downloadFile(response.fileName);
            } else {
                setResult('Error: ' + response.message);
            }
        } catch (error: any) {
            setResult('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tool-container">
            <h2>Protect PDF with Password</h2>
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
                    User Password:
                    <input
                        type="password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Password to open PDF"
                    />
                </label>
                {/*<label hidden>*/}
                {/*    Owner Password:*/}
                    <input
                        type="password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Password to open PDF"
                        hidden
                    />
                {/*</label>*/}
                <label className="pdf-toggle">
                    <span>Enable Print Option</span>
                    <input
                        type="checkbox"
                        checked={enablePrint}
                        onChange={(e) => setEnablePrint(e.target.checked)}
                    />
                    <span className="slider" />
                </label>

            </div>
            <button onClick={handleProtect} disabled={loading || !file}>
                {loading ? 'Protecting...' : 'Protect PDF'}
            </button>
            {result && <p className="result">{result}</p>}
        </div>
    );
};
export default ProtectPdf;
