import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, ChevronLeft, ChevronRight, FileText, ZoomIn, ZoomOut } from 'lucide-react';

// Set the PDF.js worker — use the bundled worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

/**
 * PdfReader — renders each PDF page to a <canvas> using PDF.js.
 * Because we render to canvas there is no underlying file stream the
 * browser can intercept with Ctrl+S / right-click Save, and the
 * @media print rule hides the entire overlay so Ctrl+P prints nothing.
 *
 * Props:
 *   url   {string}  — blob:// URL of the PDF (created from api response blob)
 *   title {string}  — displayed in the header
 *   onClose {fn}    — called when the reader should be dismissed
 */
const PdfReader = ({ url, title, onClose }) => {
    const canvasRef = useRef(null);
    const pdfRef = useRef(null);
    const renderTaskRef = useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.3);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pageInput, setPageInput] = useState('1');

    // Block Ctrl+S and Ctrl+P while the reader is open
    useEffect(() => {
        const blockShortcuts = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', blockShortcuts, true);
        return () => window.removeEventListener('keydown', blockShortcuts, true);
    }, []);

    // Load the PDF document
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        pdfjsLib.getDocument(url).promise.then((pdf) => {
            if (cancelled) return;
            pdfRef.current = pdf;
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            setPageInput('1');
            setLoading(false);
        }).catch((err) => {
            if (!cancelled) {
                console.error('PDF.js load error:', err);
                setError('Failed to load the e-book. Please try again.');
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [url]);

    // Render the current page whenever currentPage or scale changes
    const renderPage = useCallback(async (pageNum) => {
        const pdf = pdfRef.current;
        const canvas = canvasRef.current;
        if (!pdf || !canvas) return;

        // Cancel any ongoing render
        if (renderTaskRef.current) {
            try { await renderTaskRef.current.cancel(); } catch (_) { }
        }

        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const context = canvas.getContext('2d');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderTask = page.render({ canvasContext: context, viewport });
            renderTaskRef.current = renderTask;
            await renderTask.promise;
        } catch (err) {
            if (err?.name !== 'RenderingCancelledException') {
                console.error('PDF render error:', err);
            }
        }
    }, [scale]);

    useEffect(() => {
        if (!loading && totalPages > 0) {
            renderPage(currentPage);
        }
    }, [currentPage, scale, loading, totalPages, renderPage]);

    const goToPrev = () => {
        const p = Math.max(1, currentPage - 1);
        setCurrentPage(p);
        setPageInput(String(p));
    };
    const goToNext = () => {
        const p = Math.min(totalPages, currentPage + 1);
        setCurrentPage(p);
        setPageInput(String(p));
    };
    const handlePageInput = (e) => {
        setPageInput(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            setCurrentPage(n);
        }
    };
    const zoomIn = () => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)));
    const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)));

    return (
        <>
            {/* Print suppression */}
            <style>{`
                @media print {
                    .pdf-reader-overlay { display: none !important; }
                    body::after {
                        content: 'Printing is disabled for e-books.';
                        display: flex; align-items: center; justify-content: center;
                        height: 100vh; font-size: 1.5rem; color: #333;
                    }
                }
                .pdf-reader-canvas-wrap { user-select: none; -webkit-user-select: none; }
            `}</style>

            <div
                className="pdf-reader-overlay fixed inset-0 z-50 flex flex-col bg-gray-950"
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white flex-shrink-0 border-b border-gray-700">
                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{title}</span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 mx-4 flex-shrink-0">
                        {/* Zoom */}
                        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Zoom out">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-gray-400 w-10 text-center">{Math.round(scale * 100)}%</span>
                        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Zoom in">
                            <ZoomIn className="w-4 h-4" />
                        </button>

                        <div className="w-px h-4 bg-gray-600 mx-1" />

                        {/* Page navigation */}
                        <button onClick={goToPrev} disabled={currentPage <= 1} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1 text-xs">
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageInput}
                                onChange={handlePageInput}
                                className="w-10 text-center bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white text-xs focus:outline-none focus:border-primary-400"
                            />
                            <span className="text-gray-400">/ {totalPages}</span>
                        </div>
                        <button onClick={goToNext} disabled={currentPage >= totalPages} className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                        Close
                    </button>
                </div>

                {/* ── Canvas area ── */}
                <div className="flex-1 overflow-auto bg-gray-800 flex items-start justify-center p-4 pdf-reader-canvas-wrap">
                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 text-white">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                            <p className="text-sm text-gray-300">Loading e-book…</p>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>
                    )}
                    {!loading && !error && (
                        <canvas
                            ref={canvasRef}
                            className="shadow-2xl rounded"
                            style={{ maxWidth: '100%' }}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default PdfReader;
