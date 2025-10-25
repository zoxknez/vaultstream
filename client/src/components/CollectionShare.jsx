import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  QrCode,
  Link as LinkIcon,
  FileJson,
  Users,
  Sparkles
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import collectionsService from '../services/collectionsService';
import './CollectionShare.css';
import { formatErrorMessage } from '../utils/errorUtils';

const CollectionShare = () => {
  const [activeTab, setActiveTab] = useState('export'); // export | import
  const [selectedCollection, setSelectedCollection] = useState('watchlist');
  const [shareUrl, setShareUrl] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [importData, setImportData] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [toast, setToast] = useState(null);

  const collections = {
    watchlist: { 
      name: 'My Watchlist', 
      icon: Sparkles,
      getData: () => collectionsService.getWatchlist()
    },
    continueWatching: { 
      name: 'Continue Watching', 
      icon: Users,
      getData: () => collectionsService.getContinueWatching()
    },
    history: { 
      name: 'Watch History', 
      icon: FileJson,
      getData: () => collectionsService.getWatchHistory()
    }
  };

  useEffect(() => {
    if (shareUrl) {
      generateQRCode(shareUrl);
    }
  }, [shareUrl]);

  const generateShareableLink = () => {
    try {
      const data = collections[selectedCollection].getData();
      
      if (!data || data.length === 0) {
        showToast('error', 'Collection is empty! Add some items first.');
        return;
      }

      // Create export data
      const exportData = {
        type: selectedCollection,
        name: collections[selectedCollection].name,
        items: data,
        exportedAt: new Date().toISOString(),
        exportedBy: 'StreamVault User',
        version: '1.0'
      };

      // Encode to base64
      const jsonString = JSON.stringify(exportData);
      const base64 = btoa(encodeURIComponent(jsonString));
      
      // Generate shareable URL
      const url = `${window.location.origin}/import?data=${base64}`;
      setShareUrl(url);
      
      showToast('success', `Shareable link generated! (${data.length} items)`);
    } catch (error) {
      console.error('Error generating link:', error);
      showToast('error', 'Failed to generate link. Try again!');
    }
  };

  const generateQRCode = async (url) => {
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#06b6d4', // Cyan
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('success', 'Link copied to clipboard! 📋');
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error('Failed to copy link', copyError);
      showToast('error', 'Failed to copy link');
    }
  };

  const downloadJSON = () => {
    try {
      const data = collections[selectedCollection].getData();
      
      if (!data || data.length === 0) {
        showToast('error', 'Collection is empty!');
        return;
      }

      const exportData = {
        type: selectedCollection,
        name: collections[selectedCollection].name,
        items: data,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `streamvault-${selectedCollection}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('success', `Downloaded ${data.length} items as JSON!`);
    } catch (error) {
      console.error('Error downloading JSON:', error);
      showToast('error', 'Failed to download JSON');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) {
      showToast('error', 'Generate a link first!');
      return;
    }

    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `streamvault-qr-${selectedCollection}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast('success', 'QR Code downloaded! 📱');
  };

  const handleImport = () => {
    try {
      if (!importData.trim()) {
        showToast('error', 'Please paste JSON or URL!');
        return;
      }

      let parsedData;

      // Check if it's a URL
      if (importData.startsWith('http')) {
        const url = new URL(importData);
        const base64Data = url.searchParams.get('data');
        
        if (!base64Data) {
          showToast('error', 'Invalid share URL!');
          return;
        }

        const jsonString = decodeURIComponent(atob(base64Data));
        parsedData = JSON.parse(jsonString);
      } else {
        // Direct JSON paste
        parsedData = JSON.parse(importData);
      }

      // Validate structure
      if (!parsedData.type || !parsedData.items || !Array.isArray(parsedData.items)) {
        showToast('error', 'Invalid data format!');
        return;
      }

      // Import based on type
      let imported = 0;
      
      parsedData.items.forEach(item => {
        if (parsedData.type === 'watchlist') {
          collectionsService.addToWatchlist(item);
          imported++;
        } else if (parsedData.type === 'continueWatching') {
          collectionsService.updateProgress(item.id, {
            ...item,
            lastWatched: item.lastWatched || new Date().toISOString()
          });
          imported++;
        } else if (parsedData.type === 'history') {
          // History is read-only, but we can add to watchlist
          collectionsService.addToWatchlist(item);
          imported++;
        }
      });

      setImportResult({
        success: true,
        count: imported,
        type: parsedData.type,
        name: parsedData.name
      });

      showToast('success', `Successfully imported ${imported} items!`);
      setImportData('');
      
    } catch (error) {
      const message = formatErrorMessage(error, 'Failed to import. Check format!');
      console.error('Import error:', error);
      setImportResult({
        success: false,
        error: message
      });
      showToast('error', message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportData(event.target?.result || '');
      showToast('success', 'File loaded! Click Import to add items.');
    };
    reader.onerror = () => {
      showToast('error', 'Failed to read file');
    };
    reader.readAsText(file);
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="collection-share">
      <div className="share-container">
        {/* Header */}
        <div className="share-header">
          <div className="share-title">
            <Share2 size={28} className="share-icon" />
            <div>
              <h2>Share Collections</h2>
              <p>Export, import, or share your collections with friends</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="share-tabs">
          <button
            className={`share-tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={18} />
            Export & Share
          </button>
          <button
            className={`share-tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={18} />
            Import
          </button>
        </div>

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="share-content">
            {/* Collection Selector */}
            <div className="collection-selector">
              <label>Select Collection to Share:</label>
              <div className="collection-buttons">
                {Object.entries(collections).map(([key, collection]) => {
                  const IconComponent = collection.icon;
                  const name = collection.name;

                  return (
                  <button
                    key={key}
                    className={`collection-btn ${selectedCollection === key ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCollection(key);
                      setShareUrl('');
                      setQrCodeUrl('');
                    }}
                  >
                    {IconComponent && <IconComponent size={18} />}
                    {name}
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="share-actions">
              <button className="btn-share primary" onClick={generateShareableLink}>
                <LinkIcon size={18} />
                Generate Shareable Link
              </button>
              <button className="btn-share secondary" onClick={downloadJSON}>
                <FileJson size={18} />
                Download as JSON
              </button>
            </div>

            {/* Share URL */}
            {shareUrl && (
              <div className="share-result">
                <div className="share-url-section">
                  <label>Shareable Link:</label>
                  <div className="share-url-box">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="share-url-input"
                    />
                    <button
                      className={`btn-copy ${copied ? 'copied' : ''}`}
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="share-hint">
                    Share this URL with friends or scan the QR code below
                  </p>
                </div>

                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="qr-section">
                    <label>QR Code:</label>
                    <div className="qr-container">
                      <img src={qrCodeUrl} alt="QR Code" className="qr-image" />
                      <button className="btn-download-qr" onClick={downloadQRCode}>
                        <QrCode size={18} />
                        Download QR Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="share-content">
            <div className="import-section">
              <label>Import from URL or JSON:</label>
              <textarea
                className="import-textarea"
                placeholder="Paste shareable URL or JSON data here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={8}
              />
              
              <div className="import-actions">
                <button className="btn-import primary" onClick={handleImport}>
                  <Upload size={18} />
                  Import Collection
                </button>
                
                <label className="btn-import secondary">
                  <FileJson size={18} />
                  Upload JSON File
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                  {importResult.success ? (
                    <>
                      <Check size={20} />
                      <div>
                        <strong>Import Successful!</strong>
                        <p>
                          Added {importResult.count} items from "{importResult.name}"
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="error-icon">✕</span>
                      <div>
                        <strong>Import Failed</strong>
                        <p>{importResult.error}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`share-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default CollectionShare;
