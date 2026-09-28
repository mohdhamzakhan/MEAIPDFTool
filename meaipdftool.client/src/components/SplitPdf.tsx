import React, { useState } from 'react';
import { pdfService, type PdfOperationResponse } from '../services/pdfService';

const SplitPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [startPage, setStartPage] = useState<number>(1);
    const [endPage, setEndPage] = useState<number>(1);
    const [pageSelection, setPageSelection] = useState<string>('');
    const [splitAllPages, setSplitAllPages] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [showHintModal, setShowHintModal] = useState<boolean>(false);
    const [totalPages, setTotalPages] = useState<number>(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            // Get page count (remove this if backend doesn't support it yet)
            try {
                const response = await pdfService.getPageCount(selectedFile);
                if (response.pageCount) {
                    setTotalPages(response.pageCount);
                    setEndPage(response.pageCount);
                }
            } catch (error: any) {
                console.error('Error getting page count:', error);
            }
        }
    };

    const handleSplitAllPagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setSplitAllPages(checked);

        if (checked) {
            setPageSelection('');
            setStartPage(1);
            setEndPage(1);
        }
    };

    const handlePageSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPageSelection(e.target.value);
        // Clear split all pages and enable range inputs
        setSplitAllPages(false);
    };

    const handleSplit = async () => {
        if (!file) {
            setResult('Please select a PDF file');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            let response: PdfOperationResponse;

            
            if (splitAllPages) {
                response = await pdfService.splitAllPages(file);
                if (response.success && response.files!.length > 0) {  // ✅ ! tells TS "I know it's not undefined"
                    setResult(`✅ Split into ${response.files!.length} files!`);
                    response.files!.forEach((fileInfo) => {           // ✅ Safe now
                        pdfService.downloadFile(fileInfo.fileName);
                    });
                }
            } else if (pageSelection.trim()) {
                response = await pdfService.splitBySelection(file, pageSelection);
                if (response.success && response.files!.length > 0) {
                    setResult(`✅ Created ${response.files!.length} files!`);
                    response.files!.forEach((fileInfo) => {
                        pdfService.downloadFile(fileInfo.fileName);
                    });
                }
            } else {
                // Single range
                if (startPage < 1 || endPage < startPage) {
                    setResult('Invalid page range');
                    return setLoading(false);
                }
                response = await pdfService.splitPdf(file, startPage, endPage);
                if (response.success && response.fileName) {
                    setResult(`✅ Pages ${startPage}-${endPage} extracted!`);
                    pdfService.downloadFile(response.fileName);
                }
            }

            if (!response.success) {
                setResult(`❌ ${response.message}`);
            }
        } catch (error: any) {
            setResult(`❌ ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const isSelectionMode = !splitAllPages && pageSelection.trim() !== '';

    return (
        <div className="tool-container">
            {/* Header with Info Button */}
            <div className="header-with-info">
                <h2>Split PDF</h2>
                <button
                    className="info-icon-btn"
                    onClick={() => setShowHintModal(true)}
                    title="How to use"
                    aria-label="Help"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </button>
            </div>

            <div className="upload-section">
                <label htmlFor="pdf-file-input" className="file-upload-label">
                    Choose PDF File
                    <input
                        id="pdf-file-input"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        hidden
                    />
                </label>

                {file && (
                    <p className="file-info">
                        📄 {file.name}
                        {totalPages > 0 && <span className="page-count">({totalPages} pages)</span>}
                    </p>
                )}

                {/* Split Options */}
                <div className="split-options">
                    {/* Split All Pages Checkbox */}
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={splitAllPages}
                                onChange={handleSplitAllPagesChange}
                            />
                            <span>🔄 Split all pages individually</span>
                        </label>
                    </div>

                    {/* Replace the range inputs div with this: */}
                    <div className={`input-group ${splitAllPages || isSelectionMode ? 'disabled' : ''}`}>
                        <label>
                            Page Range
                            <div className="range-inputs">
                                <div>
                                    <label>Start Page</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages || undefined}
                                        value={startPage}
                                        onChange={(e) => setStartPage(Math.max(1, Number(e.target.value)))}
                                        disabled={splitAllPages || isSelectionMode}
                                    />
                                </div>
                                <span className="range-separator">to</span>
                                <div>
                                    <label>End Page</label>
                                    <input
                                        type="number"
                                        min={startPage}
                                        max={totalPages || undefined}
                                        value={endPage}
                                        onChange={(e) => setEndPage(Math.max(startPage, Number(e.target.value)))}
                                        disabled={splitAllPages || isSelectionMode}
                                    />
                                </div>
                            </div>
                        </label>
                    </div>


                    {/* Page Selection Input */}
                    <div className={`selection-group ${splitAllPages ? 'disabled' : ''}`}>
                        <label className="selection-label">
                            Custom Selection <span className="selection-hint">(e.g., 1,3,5 or 2-5)</span>
                            <input
                                type="text"
                                placeholder="1,2-3,5-7"
                                value={pageSelection}
                                onChange={handlePageSelectionChange}
                                disabled={splitAllPages}
                            />
                        </label>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSplit}
                    disabled={loading || !file}
                    className="split-btn"
                >
                    {loading ? '⚙️ Splitting PDF...' : '✂️ Split PDF'}
                </button>

                {result && <p className="result">{result}</p>}
            </div>

            {/* Hint Modal */}
            {showHintModal && (
                <div className="modal-overlay" onClick={() => setShowHintModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📖 How to Split PDF</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowHintModal(false)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <h4>Choose Your Split Method:</h4>

                            <div className="split-method">
                                <div className="method-icon">📄</div>
                                <div>
                                    <strong>Page Range</strong>
                                    <p>Extract pages 1-5 as one PDF</p>
                                </div>
                            </div>

                            <div className="split-method">
                                <div className="method-icon">📑</div>
                                <div>
                                    <strong>Split All Pages</strong>
                                    <p>Each page becomes separate PDF</p>
                                </div>
                            </div>

                            <div className="split-method">
                                <div className="method-icon">🎯</div>
                                <div>
                                    <strong>Custom Selection</strong>
                                    <p>Multiple selections in one go</p>
                                </div>
                            </div>

                            <div className="examples-section">
                                <h5>Page Selection Examples:</h5>
                                <div className="examples">
                                    <code>1</code> → Page 1 only
                                    <code>1,3,5</code> → Pages 1, 3, 5 separately
                                    <code>2-5</code> → Pages 2-5 as one PDF
                                    <code>1,2-3,5-7</code> → 3 separate files
                                </div>
                            </div>

                            <div className="note">
                                <strong>💡 Tip:</strong> When "Split all pages" is checked, other inputs are disabled.
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowHintModal(false)}
                                className="modal-close-btn"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SplitPdf;
