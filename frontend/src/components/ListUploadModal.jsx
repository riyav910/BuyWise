import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import api from "../api";

const PRESET_LISTS = [
  {
    title: "Weekend Groceries",
    emoji: "🛒",
    items: [
      "Amul Taaza Milk 1L",
      "Britannia Whole Wheat Bread 400g",
      "Amul Butter 500g",
      "Farm Fresh Eggs 12 pack",
      "Fortune Sunflower Oil 1L",
      "Daawat Basmati Rice 5kg"
    ],
  },
  {
    title: "Breakfast & Dairy",
    emoji: "🥞",
    items: [
      "Quaker Oats 1kg",
      "Amul Cow Milk 1L",
      "Dabur Honey 500g",
      "Britannia Marie Gold 300g",
      "Pintola Peanut Butter 1kg"
    ],
  },
  {
    title: "Household & Pantry",
    emoji: "🧼",
    items: [
      "Aashirvaad Atta 5kg",
      "Tata Salt 1kg",
      "Surf Excel Quick Wash 1kg",
      "Vim Dishwash Gel 750ml",
      "Dettol Liquid Handwash 200ml"
    ],
  },
];

export default function ListUploadModal({
  isOpen,
  onClose,
  onItemsSelected,
  inline = false,
  belowHeader = false
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [error, setError] = useState("");
  const [detectedItems, setDetectedItems] = useState([]);
  const [rawText, setRawText] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScanning(false);
    setScanStatus("");
    setError("");
    setDetectedItems([]);
    setRawText("");
    setShowRawText(false);
    setEditingIndex(null);
    setEditValue("");
    setNewItemText("");
  }, [previewUrl]);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen, handleReset]);

  // Support pasting image from clipboard (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);



  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }

    setError("");
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setScanning(true);
    setScanStatus("Analyzing image with Tesseract OCR...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setScanStatus("Connecting to OCR engine...");
      let res;
      try {
        res = await api.post("/products/parse-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (proxyErr) {
        try {
          res = await axios.post("http://localhost:8000/parse-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (localErr) {
          res = await axios.post("http://127.0.0.1:8000/parse-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      const data = res.data;
      const items = data?.items || [];
      const raw = data?.raw_text || "";
      setRawText(raw);

      if (items.length === 0) {
        setError("No clear grocery items were detected. You can type items manually or try another photo.");
        setDetectedItems([]);
      } else {
        setDetectedItems(items);
        setScanStatus("");
      }
    } catch (err) {
      console.error("OCR Request Error:", err);
      setError("Could not process the image. Please verify that the backend server is running on port 8000.");
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handlePresetSelect = (preset) => {
    setError("");
    setPreviewUrl(null);
    setDetectedItems([...preset.items]);
    setRawText(`Preset Selected: ${preset.title}\n` + preset.items.join("\n"));
  };

  const handleRemoveItem = (index) => {
    setDetectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditValue(detectedItems[index]);
  };

  const handleSaveEdit = (index) => {
    if (editValue.trim()) {
      setDetectedItems((prev) => {
        const next = [...prev];
        next[index] = editValue.trim();
        return next;
      });
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    setDetectedItems((prev) => [...prev, newItemText.trim()]);
    setNewItemText("");
  };

  const handleCompareClick = () => {
    if (detectedItems.length === 0) {
      setError("Please add or detect at least one item to compare.");
      return;
    }
    if (onItemsSelected) {
      onItemsSelected(detectedItems);
    }
    onClose();
  };

  if (!isOpen) return null;

  const cardContent = (
    <div
      className={`ocr-modal-card ${inline ? "ocr-inline-card" : ""} ${belowHeader ? "ocr-dropdown-card" : ""} fade-up`}
      onClick={(e) => e.stopPropagation()}
    >
        {/* Header */}
        <div className="ocr-modal-header">
          <div className="ocr-modal-title-row">
            <span className="ocr-modal-badge-icon">📷</span>
            <div>
              <h2 className="ocr-modal-title">Scan Grocery List Photo</h2>
              <p className="ocr-modal-subtitle">
                Upload a photo or screenshot of your computer-typed shopping list to compare prices across Blinkit, Zepto, BigBasket & JioMart.
              </p>
            </div>
          </div>
          <button className="ocr-modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="ocr-modal-body">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleFileChange}
            onClick={(e) => {
              e.target.value = null;
            }}
          />

          {error && <div className="ocr-alert-banner">{error}</div>}

          {/* If no items detected yet and not scanning: Show Dropzone & Presets */}
          {detectedItems.length === 0 && !scanning && (
            <>
              <div
                className={`ocr-dropzone ${isDragOver ? "ocr-dropzone-active" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="ocr-dropzone-icon">🖼️</div>
                <div className="ocr-dropzone-primary-text">
                  Drag & drop your list photo here, or browse
                </div>
                <div className="ocr-dropzone-hint">
                  Supports PNG, JPG, WebP · Digital notes, screenshots & printed documents
                </div>
                <button
                  type="button"
                  className="ocr-browse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  📁 Choose Photo from Device
                </button>
                <div className="ocr-dropzone-tip" style={{ marginTop: "12px" }}>
                  💡 Tip: You can also press <kbd>Ctrl+V</kbd> to paste a screenshot directly!
                </div>
              </div>

              {/* Sample Presets for Quick Testing */}
              <div className="ocr-presets-section">
                <div className="ocr-presets-label">Or test with a sample typed list:</div>
                <div className="ocr-presets-grid">
                  {PRESET_LISTS.map((p) => (
                    <button
                      key={p.title}
                      className="ocr-preset-card"
                      onClick={() => handlePresetSelect(p)}
                    >
                      <span className="ocr-preset-emoji">{p.emoji}</span>
                      <div className="ocr-preset-text">
                        <span className="ocr-preset-title">{p.title}</span>
                        <span className="ocr-preset-count">{p.items.length} items</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Scanning Animation State */}
          {scanning && (
            <div className="ocr-scanning-box">
              {previewUrl && (
                <div className="ocr-preview-container">
                  <img src={previewUrl} alt="List scan preview" className="ocr-preview-img" />
                  <div className="ocr-scan-laser" />
                </div>
              )}
              <div className="ocr-scanning-indicator">
                <div className="ocr-spinner" />
                <div>
                  <div className="ocr-scanning-title">Scanning list with OCR...</div>
                  <div className="ocr-scanning-subtitle">{scanStatus}</div>
                </div>
              </div>
            </div>
          )}

          {/* Detected Items Review State */}
          {detectedItems.length > 0 && !scanning && (
            <div className="ocr-results-container fade-up">
              <div className="ocr-results-header">
                <div>
                  <h3 className="ocr-results-title">
                    ✨ Detected {detectedItems.length} {detectedItems.length === 1 ? "Item" : "Items"}
                  </h3>
                  <p className="ocr-results-subtitle">
                    Review and edit your items before comparing live store prices.
                  </p>
                </div>
                {previewUrl && (
                  <button
                    className="ocr-change-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 Change Photo
                  </button>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={handleFileChange}
              />

              {/* List of Chips / Tags */}
              <div className="ocr-chips-list">
                {detectedItems.map((item, idx) => (
                  <div key={idx} className="ocr-item-chip">
                    {editingIndex === idx ? (
                      <input
                        className="ocr-chip-input"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleSaveEdit(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(idx);
                          if (e.key === "Escape") setEditingIndex(null);
                        }}
                      />
                    ) : (
                      <>
                        <span
                          className="ocr-chip-label"
                          onClick={() => handleStartEdit(idx)}
                          title="Click to edit item"
                        >
                          {item}
                        </span>
                        <button
                          className="ocr-chip-edit-icon"
                          onClick={() => handleStartEdit(idx)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                    <button
                      className="ocr-chip-remove-btn"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item manually */}
              <form onSubmit={handleAddNewItem} className="ocr-add-item-form">
                <input
                  type="text"
                  placeholder="+ Add another item (e.g. Tomato 1kg)..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="ocr-add-item-input"
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  className="ocr-add-item-btn"
                >
                  Add
                </button>
              </form>

              {/* Collapsible Raw Text Inspector */}
              {rawText && (
                <div className="ocr-raw-section">
                  <button
                    type="button"
                    className="ocr-raw-toggle"
                    onClick={() => setShowRawText(!showRawText)}
                  >
                    <span>{showRawText ? "▼ Hide" : "▶ Show"} Raw OCR Detection</span>
                  </button>
                  {showRawText && (
                    <pre className="ocr-raw-box">{rawText}</pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="ocr-modal-footer">
          {detectedItems.length > 0 ? (
            <>
              <button
                className="ocr-btn ocr-btn-secondary"
                onClick={handleReset}
              >
                Scan Another List
              </button>
              <button
                className="ocr-btn ocr-btn-primary"
                onClick={handleCompareClick}
              >
                🚀 Compare All {detectedItems.length} Items Now →
              </button>
            </>
          ) : (
            <button className="ocr-btn ocr-btn-secondary" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
  );

  if (inline) {
    return (
      <div className="ocr-inline-wrapper" onClick={(e) => e.stopPropagation()}>
        {cardContent}
      </div>
    );
  }

  if (belowHeader) {
    return (
      <div className="ocr-below-header-container" onClick={(e) => e.stopPropagation()}>
        {cardContent}
      </div>
    );
  }

  return (
    <div className="ocr-modal-overlay" onClick={onClose}>
      {cardContent}
    </div>
  );
}
