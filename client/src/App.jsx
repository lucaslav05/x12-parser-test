import { useState, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [ediInput, setEdiInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEdiInput(event.target.result);
        setError(null);
        setJsonOutput(null);
      };
      reader.readAsText(file);
    }
  };

  const handleConvert = async () => {
    if (!ediInput.trim()) {
      setError('Please paste or upload an EDI file');
      return;
    }

    setLoading(true);
    setError(null);
    setJsonOutput(null);

    try {
      const response = await fetch(`${API_URL}/api/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ edi: ediInput }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to parse EDI');
      }

      setJsonOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (jsonOutput) {
      await navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (jsonOutput) {
      const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edi-output.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClear = () => {
    setEdiInput('');
    setJsonOutput(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>X12 EDI to JSON Converter</h1>
        <p>Convert 204 Motor Carrier Load Tender EDI files to structured JSON</p>
      </header>

      <main className="main">
        <div className="panel input-panel">
          <div className="panel-header">
            <h2>EDI Input</h2>
            <div className="button-group">
              <label className="upload-btn">
                Upload File
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".edi,.txt,.x12"
                  onChange={handleFileUpload}
                  hidden
                />
              </label>
              <button className="clear-btn" onClick={handleClear}>
                Clear
              </button>
            </div>
          </div>
          <textarea
            className="edi-textarea"
            value={ediInput}
            onChange={(e) => setEdiInput(e.target.value)}
            placeholder="Paste your EDI content here or upload a file..."
            spellCheck="false"
          />
          <button
            className="convert-btn"
            onClick={handleConvert}
            disabled={loading || !ediInput.trim()}
          >
            {loading ? 'Converting...' : 'Convert to JSON'}
          </button>
        </div>

        <div className="panel output-panel">
          <div className="panel-header">
            <h2>JSON Output</h2>
            {jsonOutput && (
              <div className="button-group">
                <button className="action-btn" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="action-btn" onClick={handleDownload}>
                  Download
                </button>
              </div>
            )}
          </div>
          <div className="json-output">
            {error && <div className="error-message">{error}</div>}
            {jsonOutput && (
              <pre>{JSON.stringify(jsonOutput, null, 2)}</pre>
            )}
            {!jsonOutput && !error && (
              <div className="placeholder">
                JSON output will appear here after conversion
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
