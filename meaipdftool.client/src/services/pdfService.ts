import axios from 'axios';

const API_BASE_URL = 'https://10.235.20.49:8978/api/pdf'

export interface PdfOperationResponse {
    success: boolean;
    message: string;
    filePath?:string;
    fileName?: string;
    extractedText?: string;
    files?: FileInfo[];
    pageCount?: number;
}

export interface FileInfo {
    fileName: string;
    filePath: string;
}

interface TextItem {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    page: number;
}

export type PdfEditMode =
    | 'addText'
    | 'watermark'
    | 'rotate'
    | 'remove';


export const pdfService = {
    mergePdfs: async (files: File[]): Promise<PdfOperationResponse> => {
        const formData = new FormData()
        files.forEach(file => formData.append('files', file));
        const response = await axios.post<PdfOperationResponse>(`${API_BASE_URL}/merge`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    splitPdf: async (file: File, startPage: number, endPage: number): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('startPage', startPage.toString());
        formData.append('endPage', endPage.toString());

        const response = await axios.post<PdfOperationResponse>(`${API_BASE_URL}/split`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    splitAllPages: async (file: File): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post<PdfOperationResponse>(
            `${API_BASE_URL}/split-all`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    splitBySelection: async (file: File, pageSelection: string): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pageSelection', pageSelection);

        const response = await axios.post<PdfOperationResponse>(
            `${API_BASE_URL}/split-selection`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    getPageCount: async (file: File): Promise<{ success: boolean; pageCount?: number }> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(
            `${API_BASE_URL}/page-count`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    protectPdf: async (file: File, userPassword: string, ownerPassword: string, enablePrint: boolean): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userPassword', userPassword);
        formData.append('ownerPassword', ownerPassword);
        formData.append('enablePrint', enablePrint ? 'true' : 'false');

        const response = await axios.post<PdfOperationResponse>(`${API_BASE_URL}/protect`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    compressPdf: async (file: File, quality: string): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('quality', quality);

        const response = await axios.post<PdfOperationResponse>(`${API_BASE_URL}/compress`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data;
    },

    extractText: async (file: File): Promise<PdfOperationResponse & { extractedText?: string }> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/extract-text`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    covertPdf: async (file: File, format: 'word' | 'excel'): Promise<PdfOperationResponse> => {
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = format === 'word' ? 'convert-to-word' : 'convert-to-excel';
        const response = await axios.post<PdfOperationResponse>(`${API_BASE_URL}/${endpoint}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    ocrImage: async (file: File): Promise<PdfOperationResponse & { extractedText?: string }> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE_URL}/ocr-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getExtractedText: async (fileName: string): Promise<string> => {
        const response = await axios.get(`${API_BASE_URL}/get-text/${fileName}`, {
            responseType: 'text'
        });
        return response.data;
    },

    //translatePdf: async (file: File) => {
    //    const formData = new FormData();
    //    formData.append('file', file);
    //    console.log(API_BASE_URL)
    //    const response = await axios.post(`${API_BASE_URL}/translate`, formData, {
    //        headers: { 'Content-Type': 'multipart/form-data' }
    //    });

    //    return response.data;
    //},

    translatePdf: async (
        file: File,
        sourceLang: string = 'en',
        targetLang: string = 'es' // Change default as needed
    ): Promise<PdfOperationResponse & { originalText?: string, translatedText?: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sourceLang', sourceLang);
        formData.append('targetLang', targetLang);

        const response = await axios.post(`${API_BASE_URL}/translate`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        return response.data;
    },

    editPdf: async (
        file: File,
        editMode: PdfEditMode,
        options: {
            text?: string;
            x?: number;
            y?: number;
            pageNum?: number;
            rotationAngle?: number;
            textItems?: TextItem[];
        }
    ): Promise<PdfOperationResponse> => {

        const formData = new FormData();
        formData.append('file', file);

        let endpoint: string;

        switch (editMode) {
            case 'addText':
                if (!options.textItems || options.textItems.length === 0) {
                    throw new Error('addText requires textItems array');
                }
                formData.append('textItems', JSON.stringify(options.textItems));
                endpoint = 'add-text';
                break;

            case 'watermark':
                if (!options.text) {
                    throw new Error('watermark requires text');
                }
                formData.append('watermarkText', options.text);
                endpoint = 'add-watermark';
                break;

            case 'rotate':
                if (options.pageNum == null || options.rotationAngle == null) {
                    throw new Error('rotate requires pageNum and rotationAngle');
                }
                formData.append('pageNumbers', options.pageNum.toString());
                formData.append('angle', options.rotationAngle.toString());
                endpoint = 'rotate-pages';
                break;

            case 'remove':
                if (options.pageNum == null) {
                    throw new Error('remove requires pageNum');
                }
                formData.append('pageNumber', options.pageNum.toString());
                endpoint = 'remove-page';
                break;

            default:
                throw new Error(`Unsupported edit mode: ${editMode}`);
        }

        const response = await axios.post<PdfOperationResponse>(
            `${API_BASE_URL}/${endpoint}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );

        return response.data;
    },

    downloadFile: (fileName:string) =>{
        window.open(`${API_BASE_URL}/download/${encodeURIComponent(fileName)}`, '_blank');
    }
}