import { useState, useEffect } from 'react';

interface TranslationResult {
    success: boolean;
    message: string;
    fileName?: string;
    filePath?: string;
    originalText?: string;
    translatedText?: string;
}

interface Language {
    code: string;
    name: string;
    targets: string[];
}

interface TranslatorProps {
    apiBaseUrl?: string;
    libreTranslateUrl?: string;
}

type PdfOutput = 'file' | 'text';

// Shared styles
const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '12px',
    fontWeight: '500',
    color: '#4b5563',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '400',
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: '#fafbfc',
    transition: 'all 0.2s ease',
    color: '#1a1a1a',
};

const focusIn = (e: React.FocusEvent<HTMLElement>) => {
    e.target.style.borderColor = '#1a1a1a';
    e.target.style.backgroundColor = 'white';
};
const focusOut = (e: React.FocusEvent<HTMLElement>) => {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.backgroundColor = '#fafbfc';
};

export default function Translator({
    apiBaseUrl = 'https://10.235.20.49:8978',
    libreTranslateUrl = 'https://10.235.20.49:8979'
}: TranslatorProps) {
    const [mode, setMode] = useState<'text' | 'pdf'>('text');
    const [file, setFile] = useState<File | null>(null);
    const [textInput, setTextInput] = useState('');
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('ja');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TranslationResult | null>(null);
    const [error, setError] = useState('');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [availableTargets, setAvailableTargets] = useState<string[]>([]);
    const [pdfOutput, setPdfOutput] = useState<PdfOutput>('file');

    useEffect(() => {
        fetchLanguages();
    }, [libreTranslateUrl]);

    useEffect(() => {
        const source = languages.find(lang => lang.code === sourceLang);
        if (source) {
            setAvailableTargets(source.targets);
            if (!source.targets.includes(targetLang)) {
                setTargetLang(source.targets[0] || 'en');
            }
        }
    }, [sourceLang, languages]);

    const fetchLanguages = async () => {
        try {
            const response = await fetch(`${libreTranslateUrl}/languages`);
            if (!response.ok) throw new Error('Failed to fetch languages');
            const data: Language[] = await response.json();
            setLanguages(data);
            if (data.length > 0) {
                setSourceLang(data[0].code);
                setAvailableTargets(data[0].targets);
                setTargetLang('ja');
            }
        } catch (err: any) {
            setError('Failed to load languages. Make sure LibreTranslate is running on ' + libreTranslateUrl);
            console.error(err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setResult(null);
        }
    };

    const handleTextTranslate = async () => {
        if (!textInput.trim()) {
            setError('Please enter text to translate');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`${apiBaseUrl}/api/pdf/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textInput,
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                }),
            });

            if (!response.ok) {
                throw new Error('Translation failed');
            }

            const data = await response.json();
            setResult({
                success: data.success,
                message: data.message || 'Translation successful',
                originalText: textInput,
                translatedText: data.translatedText,
            });
        } catch (err: any) {
            setError(err.message || 'Translation failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePdfTranslate = async () => {
        if (!file) {
            setError('Please select a PDF file');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceLang', sourceLang);
        formData.append('targetLang', targetLang);

        const endpoint = pdfOutput === 'file' ? 'translate-file' : 'translate';

        try {
            const response = await fetch(`${apiBaseUrl}/api/pdf/${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.success) {
                throw new Error(data?.message || 'Translation failed');
            }

            setResult({
                success: data.success,
                message: data.message,
                fileName: data.fileName,
                filePath: data.filePath,
                originalText: data.originalText,
                translatedText: data.translatedText,
            });
        } catch (err: any) {
            setError(err.message || 'Translation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        console.log(result)
        if (!result?.fileName) return;
        try {
            const res = await fetch(`${apiBaseUrl}/api/pdf/download/${encodeURIComponent(result.fileName)}`);
            if (!res.ok) {
                setError(`Download failed (${res.status}) for ${result.fileName}`);
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError('Download failed: ' + (err.message || 'network error'));
        }
    };

    const getLanguageName = (code: string) => {
        const lang = languages.find(l => l.code === code);
        return lang?.name || code.toUpperCase();
    };

    const pdfButtonLabel = loading
        ? (pdfOutput === 'file' ? 'Translating file… this may take a few minutes' : 'Translating...')
        : (pdfOutput === 'file' ? 'Translate PDF to File' : 'Translate PDF');

    const modeButtonStyle = (active: boolean): React.CSSProperties => ({
        padding: '10px 28px',
        backgroundColor: active ? '#1a1a1a' : 'transparent',
        color: active ? 'white' : '#6b7280',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: '#fafbfc',
            padding: '60px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <h1 style={{
                        color: '#1a1a1a',
                        fontSize: '48px',
                        fontWeight: '300',
                        marginBottom: '12px',
                        letterSpacing: '-1px'
                    }}>
                        Translator
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '400' }}>
                        Translate text and PDF documents with ease
                    </p>
                </div>

                {/* Mode Selection */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center',
                    marginBottom: '40px',
                    backgroundColor: 'white',
                    padding: '6px',
                    borderRadius: '12px',
                    maxWidth: 'fit-content',
                    margin: '0 auto 40px auto',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    <button
                        onClick={() => { setMode('text'); setError(''); setResult(null); }}
                        style={modeButtonStyle(mode === 'text')}
                    >
                        Text
                    </button>
                    <button
                        onClick={() => { setMode('pdf'); setError(''); setResult(null); }}
                        style={modeButtonStyle(mode === 'pdf')}
                    >
                        PDF
                    </button>
                </div>

                {/* Main Card */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '48px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    {/* Language Selection */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        gap: '24px',
                        marginBottom: '40px',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={labelStyle}>From</label>
                            <select
                                value={sourceLang}
                                onChange={(e) => setSourceLang(e.target.value)}
                                style={selectStyle}
                                onFocus={focusIn}
                                onBlur={focusOut}
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ paddingBottom: '12px' }}>
                            <button
                                onClick={() => {
                                    const temp = sourceLang;
                                    setSourceLang(targetLang);
                                    setTargetLang(temp);
                                }}
                                style={{
                                    fontSize: '20px',
                                    background: '#f3f4f6',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6b7280',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#1a1a1a';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.transform = 'rotate(180deg)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f3f4f6';
                                    e.currentTarget.style.color = '#6b7280';
                                    e.currentTarget.style.transform = 'rotate(0deg)';
                                }}
                                title="Swap languages"
                            >
                                ⇄
                            </button>
                        </div>

                        <div>
                            <label style={labelStyle}>To</label>
                            <select
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                style={selectStyle}
                                onFocus={focusIn}
                                onBlur={focusOut}
                            >
                                {availableTargets.map(code => (
                                    <option key={code} value={code}>
                                        {getLanguageName(code)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Input Area */}
                    {mode === 'text' ? (
                        <div>
                            <textarea
                                value={textInput}
                                onChange={(e) => {
                                    setTextInput(e.target.value);
                                    setError('');
                                    setResult(null);
                                }}
                                placeholder="Enter text to translate..."
                                style={{
                                    width: '100%',
                                    minHeight: '180px',
                                    padding: '18px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    outline: 'none',
                                    backgroundColor: '#fafbfc',
                                    transition: 'all 0.2s ease',
                                    lineHeight: '1.6',
                                    color: '#1a1a1a'
                                }}
                                onFocus={focusIn}
                                onBlur={focusOut}
                            />
                            <button
                                onClick={handleTextTranslate}
                                disabled={loading || !textInput.trim()}
                                style={{
                                    marginTop: '24px',
                                    padding: '14px 40px',
                                    background: loading || !textInput.trim() ? '#e5e7eb' : '#1a1a1a',
                                    color: loading || !textInput.trim() ? '#9ca3af' : 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: loading || !textInput.trim() ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading && textInput.trim()) e.currentTarget.style.background = '#2a2a2a';
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading && textInput.trim()) e.currentTarget.style.background = '#1a1a1a';
                                }}
                            >
                                {loading ? 'Translating...' : 'Translate'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{
                                border: '2px dashed #e5e7eb',
                                borderRadius: '12px',
                                padding: '48px',
                                textAlign: 'center',
                                backgroundColor: '#fafbfc',
                                transition: 'all 0.2s ease',
                            }}>
                                <div style={{ fontSize: '40px', marginBottom: '16px', opacity: 0.4 }}>📄</div>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    style={{
                                        display: 'inline-block',
                                        padding: '12px 32px',
                                        background: '#1a1a1a',
                                        color: 'white',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                                >
                                    Choose PDF File
                                </label>
                                {file && (
                                    <p style={{
                                        marginTop: '16px',
                                        color: '#1a1a1a',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}>
                                        {file.name}
                                    </p>
                                )}
                            </div>

                            {/* Output type: translated file or text only */}
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                justifyContent: 'center',
                                marginTop: '24px',
                            }}>
                                {(['file', 'text'] as const).map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => { setPdfOutput(opt); setResult(null); setError(''); }}
                                        disabled={loading}
                                        style={{
                                            padding: '8px 20px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            backgroundColor: pdfOutput === opt ? '#1a1a1a' : 'white',
                                            color: pdfOutput === opt ? 'white' : '#6b7280',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {opt === 'file' ? 'Translated file' : 'Text only'}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handlePdfTranslate}
                                disabled={loading || !file}
                                style={{
                                    marginTop: '24px',
                                    padding: '14px 40px',
                                    background: loading || !file ? '#e5e7eb' : '#1a1a1a',
                                    color: loading || !file ? '#9ca3af' : 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: loading || !file ? 'not-allowed' : 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading && file) e.currentTarget.style.background = '#2a2a2a';
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading && file) e.currentTarget.style.background = '#1a1a1a';
                                }}
                            >
                                {pdfButtonLabel}
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            marginTop: '24px',
                            padding: '16px 20px',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '400'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Success and Results */}
                    {result?.success && (
                        <div style={{ marginTop: '40px' }}>
                            <div style={{
                                padding: '16px 20px',
                                backgroundColor: '#f0fdf4',
                                color: '#16a34a',
                                borderRadius: '10px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                fontWeight: '400'
                            }}>
                                {result.message}
                            </div>

                            {mode === 'pdf' && result.fileName && (
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        padding: '12px 28px',
                                        backgroundColor: '#1a1a1a',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        marginBottom: '24px',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1a1a')}
                                >
                                    {pdfOutput === 'file' ? 'Download Translated File' : 'Download Translation'}
                                </button>
                            )}

                            {result.translatedText && (
                                <div style={{ marginTop: '32px' }}>
                                    <div style={{
                                        padding: '12px 20px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '10px 10px 0 0',
                                        fontWeight: '500',
                                        fontSize: '13px',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        Translation · {getLanguageName(targetLang)}
                                    </div>
                                    <div style={{
                                        padding: '24px',
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0 0 10px 10px',
                                        minHeight: '200px',
                                        maxHeight: '500px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '15px',
                                        lineHeight: '1.7',
                                        color: '#1a1a1a',
                                        fontWeight: '400'
                                    }}>
                                        {result.translatedText}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Disclaimer Text */}
                <div style={{
                    textAlign: 'left',
                    marginTop: '24px',
                    color: '#9ca3af',
                    fontSize: '13px',
                    fontWeight: '400'
                }}>
                    <b>Disclaimer:</b> Automated translations may contain inaccuracies. Please verify critical information with the original or an authorized source.
                </div>
            </div>
        </div>
    );
}