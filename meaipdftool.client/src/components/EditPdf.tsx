import React, { useState, useRef, useEffect } from 'react';
import { pdfService } from '../services/pdfService';

const EditPdf: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [editMode, setEditMode] = useState<'watermark' | 'remove' | 'rotate' | 'addText'>('watermark');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [textContent, setTextContent] = useState<string>('');
    const [pageNum, setPageNum] = useState<number>(1);
    const [rotationAngle, setRotationAngle] = useState<number>(90);

    //added for Add Text Mode
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [textItems, setTextItems] = useState<Array<{
        id: number;
        text: string;
        x: number;
        y: number;
        pdfX: number;
        pdfY: number;
        fontSize: number;
        fontFamily: string;
        page: number;
    }>>([]);
    const [fontFamily, setFontFamily] = useState<string>('Arial');
    const [selectedItem, setSelectedItem] = useState<number | null>(null);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [isAddingText, setIsAddingText] = useState<boolean>(false);
    const [newText, setNewText] = useState<string>('');
    const [fontSize, setFontSize] = useState<number>(12);
    const [pageScale, setPageScale] = useState<number>(1);
    const [zoomLevel, setZoomLevel] = useState<number>(1.5);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<any>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;

        script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        if (pdfUrl) {
            loadPdf(pdfUrl);
        }
    }, [pdfUrl, currentPage, zoomLevel]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            console.log(editMode)
            if (editMode === 'addText') {
                const url = URL.createObjectURL(selectedFile);
                setPdfUrl(url);
                setTextItems([]);
                setSelectedItem(null);
            }
        }
    };

    //Start -: this is for Add Text Mode
    const loadPdf = async (url: string) => {
        if (!(window as any).pdfjsLib) return;

        try {
            const pdf = await (window as any).pdfjsLib.getDocument(url).promise;
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            renderPage(pdf, currentPage);
        } catch (error) {
            console.error('Error loading PDF:', error);
        }
    };

    const renderPage = async (pdf: any, pageNum: number) => {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: zoomLevel });
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const containerWidth = containerRef.current?.clientWidth || 800;
        const scale = containerWidth / viewport.width;
        setPageScale(scale);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
    };

    const convertCanvasToPdfCoordinates = (canvasX: number, canvasY: number) => {
        if (!pdfDocRef.current) return { x: canvasX, y: canvasY };

        const canvas = canvasRef.current;
        if (!canvas) return { x: canvasX, y: canvasY };

        // Use zoomLevel instead of hardcoded 1.5
        const pdfX = canvasX / zoomLevel;
        const pdfY = canvasY / zoomLevel;

        return { x: pdfX, y: pdfY };
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAddingText || !newText) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        const pdfCoords = convertCanvasToPdfCoordinates(canvasX, canvasY);

        const newItem = {
            id: Date.now(),
            text: newText,
            x: canvasX,
            y: canvasY,
            pdfX: pdfCoords.x,
            pdfY: pdfCoords.y,
            fontSize,
            fontFamily,
            page: currentPage
        };

        setTextItems([...textItems, newItem]);
        setNewText('');
        setIsAddingText(false);
    };

    const handleItemMouseDown = (e: React.MouseEvent, item: any) => {
        e.stopPropagation();
        setSelectedItem(item.id);
        setDraggedItem(item.id);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggedItem) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        const pdfCoords = convertCanvasToPdfCoordinates(canvasX, canvasY);

        setTextItems(items =>
            items.map(item =>
                item.id === draggedItem
                    ? {
                        ...item,
                        x: canvasX,
                        y: canvasY,
                        pdfX: pdfCoords.x,
                        pdfY: pdfCoords.y
                    }
                    : item
            )
        );
    };

    const handleMouseUp = () => {
        setDraggedItem(null);
    };

    const deleteSelectedItem = () => {
        if (selectedItem) {
            setTextItems(items => items.filter(item => item.id !== selectedItem));
            setSelectedItem(null);
        }
    };

    //End -: this is for Add Text Mode

    const handleEdit = async () => {
        if (!file) {
            setResult('Please select a PDF file');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            let options: Parameters<typeof pdfService.editPdf>[2];

            console.log(editMode)

            switch (editMode) {
                case 'addText':
                    if (textItems.length === 0) {
                        setResult('Please add at least one text item');
                        setLoading(false);
                        return;
                    }
                    options = {
                        textItems: textItems.map(item => ({
                            text: item.text,
                            x: item.pdfX,
                            y: item.pdfY,
                            fontSize: item.fontSize,
                            fontFamily: item.fontFamily,
                            page: item.page
                        }))
                    };
                    break
                case 'rotate':
                    options = {
                        pageNum,
                        rotationAngle
                    };
                    break;

                case 'watermark':
                    if (!textContent) {
                        setResult('Watermark text is required');
                        return;
                    }
                    options = {
                        text: textContent
                    };
                    break;

                case 'remove':
                    options = {
                        pageNum
                    };
                    break;

                default:
                    setResult('Invalid edit mode');
                    return;
            }

            const response = await pdfService.editPdf(file, editMode, options);

            if (response.success && response.fileName) {
                setResult('PDF Edited successfully!');
                pdfService.downloadFile(response.fileName);
            } else {
                setResult(response.message || 'PDF edit failed');
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
    return (
        <div className="tool-container">
            <h2>Edit PDF</h2>

            <div className="upload-section">
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                {file && <p>{file.name}</p>}
            </div>

            <div className="input-group">
                <label>
                    Edit Mode:
                    <select value={editMode} onChange={(e) => setEditMode(e.target.value as any)}>
                        <option value="addText">Add Text</option>
                        <option value="watermark">Add Watermark</option>
                        <option value="remove">Remove Page</option>
                        <option value="rotate">Rotate Pages</option>
                    </select>
                </label>
            </div>

            {editMode === 'addText' && pdfUrl ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '350px 1fr', // Increased from 300px
                    gap: '20px',
                    marginTop: '20px',
                    minHeight: '800px' // ADD THIS
                }}>
                    {/* Left Panel - Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Add Text Section */}
                        <div style={{
                            background: '#f5f5f5',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #ddd'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>Add Text</h3>
                            <input
                                type="text"
                                value={newText}
                                onChange={(e) => setNewText(e.target.value)}
                                placeholder="Enter text to add"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    marginBottom: '10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    color: '#666',
                                    marginBottom: '5px'
                                }}>
                                    Font Family
                                </label>
                                <select
                                    value={fontFamily}
                                    onChange={(e) => setFontFamily(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Tahoma">Tahoma</option>
                                    <option value="Trebuchet MS">Trebuchet MS</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    color: '#666',
                                    marginBottom: '5px'
                                }}>
                                    Font Size: {fontSize}px
                                </label>
                                <input
                                    type="range"
                                    min="8"
                                    max="72"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <button
                                onClick={() => setIsAddingText(!isAddingText)}
                                disabled={!newText}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: isAddingText ? '#10b981' : '#3b82f6',
                                    color: 'white',
                                    cursor: newText ? 'pointer' : 'not-allowed',
                                    opacity: newText ? 1 : 0.5,
                                    fontWeight: '500'
                                }}
                            >
                                {isAddingText ? '✓ Click PDF to Place' : 'Enable Text Placement'}
                            </button>
                        </div>

                        {/* Text Items List */}
                        <div style={{
                            background: '#f5f5f5',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #ddd'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '10px', fontSize: '16px' }}>
                                Text Items ({textItems.filter(item => item.page === currentPage).length})
                            </h3>
                            <div style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                {textItems.filter(item => item.page === currentPage).map((item) => (
                                    <div
                                        key={item.id}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '4px',
                                            background: selectedItem === item.id ? '#dbeafe' : 'white',
                                            border: selectedItem === item.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                            position: 'relative'
                                        }}
                                    >
                                        <div
                                            onClick={() => setSelectedItem(item.id)}
                                            style={{ cursor: 'pointer', paddingRight: '30px' }}
                                        >
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                marginBottom: '4px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {item.text}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>
                                                Font: {item.fontFamily} | Size: {item.fontSize}px
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTextItems(items => items.filter(i => i.id !== item.id));
                                                if (selectedItem === item.id) setSelectedItem(null);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                width: '24px',
                                                height: '24px',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: 0
                                            }}
                                            title="Delete this text"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {selectedItem && (
                                <button
                                    onClick={deleteSelectedItem}
                                    style={{
                                        width: '100%',
                                        marginTop: '10px',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    Delete Selected
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - PDF Preview */}
                    <div style={{
                        background: '#f9fafb',
                        padding: '20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '800px' // ADD THIS
                    }}>
                        {/* Controls Row */}
                        <div style={{ marginBottom: '15px' }}>
                            {/* Zoom Controls */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                marginBottom: '10px'
                            }}>
                                <button
                                    onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))}
                                    disabled={zoomLevel <= 0.5}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: zoomLevel <= 0.5 ? '#d1d5db' : '#6b7280',
                                        color: 'white',
                                        cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '20px'
                                    }}
                                >
                                    −
                                </button>
                                <span style={{
                                    minWidth: '100px',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    color: '#374151',
                                    fontSize: '16px'
                                }}>
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                                    disabled={zoomLevel >= 3}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: zoomLevel >= 3 ? '#d1d5db' : '#6b7280',
                                        color: 'white',
                                        cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '20px'
                                    }}
                                >
                                    +
                                </button>
                                <button
                                    onClick={() => setZoomLevel(1.5)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: '#6b7280',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '14px'
                                    }}
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Page Navigation */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: currentPage === 1 ? '#d1d5db' : '#3b82f6',
                                        color: 'white',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ fontWeight: '600', color: '#374151', fontSize: '16px' }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                        border: 'none',
                                        background: currentPage === totalPages ? '#d1d5db' : '#3b82f6',
                                        color: 'white',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '14px'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                        {/* Canvas Container - Now flex-grow to fill space */}
                        <div
                            ref={containerRef}
                            style={{
                                position: 'relative',
                                background: 'white',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                borderRadius: '4px',
                                overflow: 'auto',
                                cursor: isAddingText ? 'crosshair' : 'default',
                                flex: 1, // ADD THIS - makes it grow to fill available space
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center'
                            }}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            <canvas
                                ref={canvasRef}
                                onClick={handleCanvasClick}
                                style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                            />

                            {/* Text Overlays */}
                            {textItems.filter(item => item.page === currentPage).map((item) => (
                                <div
                                    key={item.id}
                                    onMouseDown={(e) => handleItemMouseDown(e, item)}
                                    style={{
                                        position: 'absolute',
                                        left: `${(item.x / (canvasRef.current?.width || 1)) * 100}%`,
                                        top: `${(item.y / (canvasRef.current?.height || 1)) * 100}%`,
                                        fontSize: `${item.fontSize * pageScale}px`,
                                        fontFamily: item.fontFamily,
                                        cursor: 'move',
                                        userSelect: 'none',
                                        transform: 'translate(-50%, -50%)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: selectedItem === item.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(254, 240, 138, 0.4)',
                                        border: selectedItem === item.id ? '2px solid #3b82f6' : '1px solid rgba(251, 191, 36, 0.6)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {item.text}
                                </div>
                            ))}
                        </div>

                        {isAddingText && (
                            <div style={{
                                marginTop: '15px',
                                padding: '12px',
                                background: '#dbeafe',
                                border: '1px solid #93c5fd',
                                borderRadius: '4px',
                                color: '#1e40af',
                                fontSize: '14px'
                            }}>
                                <strong>Tip:</strong> Click anywhere on the PDF to place "{newText}"
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

            {editMode === 'watermark' && (
                <div className="input-group">
                    <label>
                        Watermark Text:
                        <input type="text" value={textContent} onChange={(e) => setTextContent(e.target.value)} />
                    </label>
                </div>
            )}

            {editMode === 'remove' && (
                <div className="input-group">
                    <label>
                        Page Number to Remove:
                        <input type="number" min="1" value={pageNum} onChange={(e) => setPageNum(parseInt(e.target.value))} />
                    </label>
                </div>
            )}

            {editMode === 'rotate' && (
                <div className="input-group">
                    <label>
                        Page Number:
                        <input type="number" min="1" value={pageNum} onChange={(e) => setPageNum(parseInt(e.target.value))} />
                    </label>
                    <label>
                        Rotation Angle:
                        <select value={rotationAngle} onChange={(e) => setRotationAngle(parseInt(e.target.value))}>
                            <option value={90}>90°</option>
                            <option value={180}>180°</option>
                            <option value={270}>270°</option>
                        </select>
                    </label>
                </div>
            )}

            <button onClick={handleEdit} disabled={loading || !file} style={{ marginTop: '20px' }}>
                {loading ? 'Processing...' : 'Apply Edit'}
            </button>
            {result && <p className="result">{result}</p>}
        </div>
    );
};

export default EditPdf;
