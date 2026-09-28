import { useState } from 'react';
import './App.css';
import MergePdf from './components/MergePdf';
import SplitPdf from './components/SplitPdf';
import ProtectPdf from './components/ProtectPdf';
import CompressPdf from './components/CompressPdf';
import ExtractText from './components/ExtractText';
//import ConvertPdf from './components/ConvertPdf';
import Translator from './components/TranslatePdf';
import EditPdf from './components/EditPdf';


type TabType = 'merge' | 'split' | 'protect' | 'compress' | 'extract' | 'edit' | 'translate';

function App() {
    const [activeTab, setActiveTab] = useState<TabType>('merge');

    return (
        <div className="App">
            <header className="app-header">
                <h2>MEAI Useful Tools</h2>
                <p>This is MEAI Useful Tool more options coming in future</p>
            </header>

            <div className="tabs">
                <button className={activeTab === 'merge' ? 'active' : ''} onClick={() => setActiveTab('merge')}>Merge</button>
                <button className={activeTab === 'split' ? 'active' : ''} onClick={() => setActiveTab('split')}>Split</button>
                <button className={activeTab === 'protect' ? 'active' : ''} onClick={() => setActiveTab('protect')}>Protect</button>
                <button className={activeTab === 'compress' ? 'active' : ''} onClick={() => setActiveTab('compress')}>Compress</button>
                <button className={activeTab === 'extract' ? 'active' : ''} onClick={() => setActiveTab('extract')}>Extract</button>
                <button className={activeTab === 'translate' ? 'active' : ''} onClick={() => setActiveTab('translate')}>Translate</button> 
               {/* <button className={activeTab === 'convert' ? 'active' : ''} onClick={() => setActiveTab('convert')}>Convert</button>*/}
                <button className={activeTab === 'edit' ? 'active' : ''} onClick={() => setActiveTab('edit')}>Edit</button>
                
            </div>

            <div className="content">
                {activeTab === 'merge' && <MergePdf />}
                {activeTab === 'split' && <SplitPdf />}
                {activeTab === 'protect' && <ProtectPdf />}
                {activeTab === 'compress' && <CompressPdf />}
                {activeTab === 'extract' && <ExtractText />}
                {activeTab === 'translate' && <Translator apiBaseUrl= "https://10.235.20.49:8978" libreTranslateUrl="http://10.235.20.49:8979" />}
               {/* {activeTab === 'convert' && <ConvertPdf />}*/}
                {activeTab === 'edit' && <EditPdf />}

            </div>
        </div>
    );
}

export default App;
