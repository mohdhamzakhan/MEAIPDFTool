import React, { useState, useRef, useEffect } from 'react';
import { Upload, Type, MousePointer, Download, RotateCw } from 'lucide-react';

const PdfTextEditorLive = () => {
    const [file, setFile] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [textItems, setTextItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isAddingText, setIsAddingText] = useState(false);
    const [newText, setNewText] = useState('');
    const [fontSize, setFontSize] = useState(12);
    const [pageScale, setPageScale] = useState(1);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pdfDocRef = useRef(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        };
        document.body.appendChild(script);
        return () => document.body.removeChild(script);
    }, []);

    useEffect(() => {
        if (pdfUrl) {
            loadPdf(pdfUrl);
        }
    }, [pdfUrl, currentPage]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            const url = URL.createObjectURL(selectedFile);
            setPdfUrl(url);
            setTextItems([]);
            setSelectedItem(null);
        }
    };

    const loadPdf = async (url) => {
        if (!window.pdfjsLib) return;

        try {
            const pdf = await window.pdfjsLib.getDocument(url).promise;
            pdfDocRef.current = pdf;
            setTotalPages(pdf.numPages);
            renderPage(pdf, currentPage);
        } catch (error) {
            console.error('Error loading PDF:', error);
        }
    };

    const renderPage = async (pdf, pageNum) => {
        const page = await pdf.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.5 });
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

    const handleCanvasClick = (e) => {
        if (!isAddingText || !newText) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const newItem = {
            id: Date.now(),
            text: newText,
            x,
            y,
            fontSize,
            page: currentPage
        };

        setTextItems([...textItems, newItem]);
        setNewText('');
        setIsAddingText(false);
    };

    const handleItemMouseDown = (e, item) => {
        e.stopPropagation();
        setSelectedItem(item.id);
        setDraggedItem(item.id);
    };

    const handleMouseMove = (e) => {
        if (!draggedItem) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setTextItems(items =>
            items.map(item =>
                item.id === draggedItem
                    ? { ...item, x, y }
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

    const handleApply = async () => {
        if (!file || textItems.length === 0) {
            alert('Please add at least one text item');
            return;
        }

        // Here you would send the textItems array to your backend
        // Each item contains: { text, x, y, fontSize, page }
        console.log('Applying text items:', textItems);
        alert('In production, this would send data to your backend API:\n' + JSON.stringify(textItems, null, 2));
    };

    const currentPageItems = textItems.filter(item => item.page === currentPage);

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Type className="w-8 h-8 text-blue-600" />
                        PDF Text Editor - Live Preview
                    </h1>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg appearance-none cursor-pointer hover:border-blue-400 focus:outline-none">
                            <div className="flex flex-col items-center space-y-2">
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="font-medium text-gray-600">
                                    {file ? file.name : 'Click to upload PDF'}
                                </span>
                            </div>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {pdfUrl && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Controls Panel */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-700 mb-3">Add Text</h3>
                                    <input
                                        type="text"
                                        value={newText}
                                        onChange={(e) => setNewText(e.target.value)}
                                        placeholder="Enter text to add"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <div className="mb-2">
                                        <label className="block text-sm text-gray-600 mb-1">Font Size: {fontSize}px</label>
                                        <input
                                            type="range"
                                            min="8"
                                            max="72"
                                            value={fontSize}
                                            onChange={(e) => setFontSize(parseInt(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setIsAddingText(!isAddingText)}
                                        disabled={!newText}
                                        className={`w-full px-4 py-2 rounded-lg font-medium transition ${isAddingText
                                                ? 'bg-green-600 text-white hover:bg-green-700'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                                            }`}
                                    >
                                        {isAddingText ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <MousePointer className="w-4 h-4" />
                                                Click on PDF to place
                                            </span>
                                        ) : (
                                            'Enable Text Placement'
                                        )}
                                    </button>
                                </div>

                                {/* Text Items List */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-gray-700 mb-3">Text Items ({currentPageItems.length})</h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {currentPageItems.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSelectedItem(item.id)}
                                                className={`p-2 rounded cursor-pointer transition ${selectedItem === item.id
                                                        ? 'bg-blue-100 border-2 border-blue-500'
                                                        : 'bg-white border border-gray-200 hover:border-blue-300'
                                                    }`}
                                            >
                                                <div className="text-sm font-medium text-gray-800 truncate">{item.text}</div>
                                                <div className="text-xs text-gray-500">
                                                    Size: {item.fontSize}px | Pos: ({Math.round(item.x)}, {Math.round(item.y)})
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedItem && (
                                        <button
                                            onClick={deleteSelectedItem}
                                            className="w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                        >
                                            Delete Selected
                                        </button>
                                    )}
                                </div>

                                {/* Apply Button */}
                                <button
                                    onClick={handleApply}
                                    disabled={textItems.length === 0}
                                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    Apply & Download
                                </button>
                            </div>

                            {/* PDF Preview */}
                            <div className="lg:col-span-2">
                                <div className="bg-gray-100 rounded-lg p-4">
                                    {/* Page Navigation */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                                        >
                                            Previous
                                        </button>
                                        <span className="font-medium text-gray-700">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                                        >
                                            Next
                                        </button>
                                    </div>

                                    {/* Canvas Container */}
                                    <div
                                        ref={containerRef}
                                        className="relative bg-white shadow-lg rounded overflow-hidden"
                                        style={{ cursor: isAddingText ? 'crosshair' : 'default' }}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                    >
                                        <canvas
                                            ref={canvasRef}
                                            onClick={handleCanvasClick}
                                            className="w-full"
                                        />

                                        {/* Text Overlays */}
                                        {currentPageItems.map((item) => (
                                            <div
                                                key={item.id}
                                                onMouseDown={(e) => handleItemMouseDown(e, item)}
                                                style={{
                                                    position: 'absolute',
                                                    left: `${(item.x / canvasRef.current?.width) * 100}%`,
                                                    top: `${(item.y / canvasRef.current?.height) * 100}%`,
                                                    fontSize: `${item.fontSize * pageScale}px`,
                                                    cursor: 'move',
                                                    userSelect: 'none',
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                                className={`text-black font-sans px-2 py-1 rounded transition ${selectedItem === item.id
                                                        ? 'bg-blue-200 bg-opacity-50 ring-2 ring-blue-500'
                                                        : 'bg-yellow-100 bg-opacity-30 hover:bg-opacity-50'
                                                    }`}
                                            >
                                                {item.text}
                                            </div>
                                        ))}
                                    </div>

                                    {isAddingText && (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
                                            <strong>Tip:</strong> Click anywhere on the PDF to place "{newText}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PdfTextEditorLive;