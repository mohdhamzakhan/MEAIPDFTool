import React, { useState } from 'react';
import { Upload, X, GripVertical, FileText, Download, Info } from 'lucide-react';
import { pdfService } from '../services/pdfService';

type OrderedFile = {
    id: string;
    file: File;
    order: number;
};

export default function MergePdf() {
    const [files, setFiles] = useState<OrderedFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [result, setResult] = useState('');
    const [showHintModal, setShowHintModal] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selected = Array.from(e.target.files).map((f, idx) => ({
                id: `${f.name}-${idx}-${Date.now()}`,
                file: f,
                order: files.length + idx,
            }));
            setFiles(prev => [...prev, ...selected]);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newFiles = [...files];
        const draggedFile = newFiles[draggedIndex];
        newFiles.splice(draggedIndex, 1);
        newFiles.splice(index, 0, draggedFile);

        setFiles(newFiles.map((f, i) => ({ ...f, order: i })));
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            setResult('❌ Please select at least 2 PDF files');
            return;
        }
        setLoading(true);
        setResult('');

        try {
            // Sort files by order before sending to backend
            const orderedFiles = [...files].sort((a, b) => a.order - b.order);
            const fileList = orderedFiles.map(f => f.file);

            // Call your actual pdfService
            const response = await pdfService.mergePdfs(fileList);

            if (response.success && response.fileName) {
                setResult('✅ PDFs merged successfully!');
                // Trigger download
                pdfService.downloadFile(response.fileName);
            } else {
                setResult(`❌ ${response.message || 'Failed to merge PDFs'}`);
            }
        } catch (error: any) {
            setResult(`❌ ${error.response?.data?.message || error.message || 'Error merging PDFs'}`);
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="tool-container">
            {/* Header with Info Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Merge PDFs</h2>
                <button
                    onClick={() => setShowHintModal(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#64748b'
                    }}
                    title="How to use"
                    aria-label="Help"
                >
                    <Info className="w-5 h-5" />
                </button>
            </div>

            <div className="upload-section">
                {/* Upload Button */}
                <label
                    htmlFor="file-upload"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        marginBottom: '16px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                >
                    <Upload className="w-4 h-4" />
                    Choose PDF Files
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </label>

                {files.length > 0 && (
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                        📄 {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                )}

                {/* Files List */}
                {files.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ marginBottom: '12px' }}>
                            <strong style={{ fontSize: '15px' }}>Files to merge ({files.length})</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {files.map((f, index) => (
                                <div
                                    key={f.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        padding: '12px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        background: 'white',
                                        cursor: 'move',
                                        opacity: draggedIndex === index ? 0.5 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ marginTop: '2px' }}>
                                        <GripVertical className="w-4 h-4 text-slate-400" />
                                    </div>

                                    <div style={{ marginTop: '2px' }}>
                                        <FileText className="w-5 h-5 text-slate-700" />
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>
                                            {index + 1}. {f.file.name}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                            {formatFileSize(f.file.size)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => removeFile(f.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            color: '#94a3b8',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                        aria-label="Remove file"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Merge Button */}
                <button
                    onClick={handleMerge}
                    disabled={loading || files.length < 2}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: files.length < 2 ? '#cbd5e1' : '#0f172a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: files.length < 2 ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        if (files.length >= 2 && !loading) {
                            e.currentTarget.style.background = '#1e293b';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (files.length >= 2 && !loading) {
                            e.currentTarget.style.background = '#0f172a';
                        }
                    }}
                >
                    {loading ? '⚙️ Merging PDFs...' : (
                        <>
                            <Download className="w-4 h-4" />
                            Merge PDFs
                        </>
                    )}
                </button>

                {/* Result Message */}
                {result && (
                    <p style={{
                        marginTop: '16px',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: result.includes('✅') ? '#f0fdf4' : '#fef2f2',
                        color: result.includes('✅') ? '#166534' : '#991b1b',
                        border: `1px solid ${result.includes('✅') ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        {result}
                    </p>
                )}
            </div>

            {/* Hint Modal */}
            {showHintModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowHintModal(false)}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '12px',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                                📖 How to Merge PDFs
                            </h3>
                            <button
                                onClick={() => setShowHintModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '0',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px' }}>
                            <h4 style={{ fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                                Steps to Merge:
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ fontSize: '24px' }}>📁</div>
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: '4px' }}>Select Files</strong>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                                            Click "Choose PDF Files" to select multiple PDFs
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ fontSize: '24px' }}>↕️</div>
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: '4px' }}>Reorder Files</strong>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                                            Drag and drop files to change merge order
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ fontSize: '24px' }}>🔗</div>
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: '4px' }}>Merge</strong>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                                            Click "Merge PDFs" to combine all files into one
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                marginTop: '20px',
                                padding: '12px',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <strong style={{ fontSize: '14px' }}>💡 Tip:</strong>
                                <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '8px' }}>
                                    Files will be merged in the order shown. Drag to reorder before merging.
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '20px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setShowHintModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#0f172a',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}