import { useState, useEffect, useRef } from "react";

type ViewMode = "code" | "preview" | "both";

interface CodePlaygroundProps {
  code: string;
  language: string;
}

export default function CodePlayground({
  code: initialCode,
  language,
}: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [dividerPos, setDividerPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 1. Eliminamos referencia al contenedor global para el cálculo
  // const containerRef = useRef<HTMLDivElement>(null);

  // 2. Creamos una referencia específica para el área del editor
  const editorAreaRef = useRef<HTMLDivElement>(null);

  // Marcar iframe como listo cuando se carga
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const handleLoad = () => setIframeReady(true);
      iframe.addEventListener("load", handleLoad);
      if (iframe.contentDocument?.readyState === "complete") {
        setIframeReady(true);
      }
      return () => iframe.removeEventListener("load", handleLoad);
    }
  }, []);

  // Auto-ejecutar para HTML/CSS
  useEffect(() => {
    if (iframeReady && (language === "html" || language === "css")) {
      executeCode();
    }
  }, [code, language, iframeReady]);

  // Re-ejecutar al cambiar vista o código en JavaScript en preview
  useEffect(() => {
    if (iframeRef.current && iframeReady) {
      const isJS = ["javascript", "js", "typescript", "ts"].includes(language);
      const shouldUpdate =
        (viewMode === "both" || viewMode === "preview") &&
        (language === "html" || language === "css" || isJS);

      if (shouldUpdate) {
        setTimeout(() => executeCode(), 50);
      }
    }
  }, [viewMode, language, code, iframeReady]);

  // Manejar drag del divisor CORREGIDO
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 3. Usamos editorAreaRef para el cálculo
      if (!isDragging || !editorAreaRef.current) return;

      const container = editorAreaRef.current;
      const rect = container.getBoundingClientRect();

      // En modo "both", el divisor es vertical (Y)
      // Como 'rect' ahora es solo el área editable, el offset del header ya no afecta
      const newPos =
        viewMode === "both"
          ? ((e.clientY - rect.top) / rect.height) * 100
          : ((e.clientX - rect.left) / rect.width) * 100;

      // Limitamos un poco más para evitar que colapse totalmente
      if (newPos > 10 && newPos < 90) {
        setDividerPos(newPos);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      // Añadimos clase al body para evitar selección de texto mientras se arrastra
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, viewMode]);

  const executeCode = () => {
    setIsRunning(true);
    setError(null);
    setOutput([]);

    try {
      if (["javascript", "js", "typescript", "ts"].includes(language)) {
        // Si estamos en modo preview/both, ejecutar en iframe con contexto visual
        if (viewMode === "preview" || viewMode === "both") {
          executeJavaScriptInPreview();
        } else {
          executeJavaScript();
        }
      } else if (language === "html") {
        executeHTML();
      } else if (language === "css") {
        executeCSS();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const executeJavaScript = () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(
        args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg),
          )
          .join(" "),
      );
      originalLog(...args);
    };

    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);
      if (result !== undefined) {
        logs.push(
          `→ ${typeof result === "object" ? JSON.stringify(result, null, 2) : result}`,
        );
      }
      setOutput(logs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      console.log = originalLog;
    }
  };

  const executeJavaScriptInPreview = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        try {
          // Generar HTML con contexto para el código JavaScript
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body {
                    margin: 0;
                    padding: 16px;
                    font-family: system-ui, -apple-system, sans-serif;
                    background: #0f1115;
                    color: #d4d4d4;
                  }
                  #output {
                    background: #0f1115;
                    border-radius: 8px;
                    padding: 0;
                  }
                  #console {
                    background: #0b0d12;
                    color: #22c55e;
                    font-family: 'Courier New', monospace;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 12px;
                    max-height: 220px;
                    overflow-y: auto;
                    font-size: 12px;
                    white-space: pre-wrap;
                    word-break: break-word;
                  }
                  .error {
                    color: #ff6b6b;
                  }
                  .success {
                    color: #51cf66;
                  }
                </style>
              </head>
              <body>
                <div id="output"></div>
                <div id="console"></div>
                <script>
                  (function() {
                    const output = document.getElementById('output');
                    const consoleDiv = document.getElementById('console');
                    const logs = [];

                    // Interceptar console.log
                    const originalLog = console.log;
                    console.log = function(...args) {
                      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
                      originalLog.apply(console, args);
                    };

                    try {
                      const userCode = ${JSON.stringify(code)};
                      // eslint-disable-next-line no-eval
                      const result = eval(userCode);

                      if (result !== undefined) {
                        logs.push(
                          typeof result === 'object'
                            ? JSON.stringify(result, null, 2)
                            : String(result)
                        );
                      }

                      // Mostrar resultados
                      if (logs.length > 0) {
                        consoleDiv.innerHTML = '<strong class="success">📋 Console Output:</strong>\\n' + logs.join('\\n');
                      } else {
                        consoleDiv.innerHTML = '<strong>✅ Código ejecutado sin errores</strong>';
                      }
                    } catch (err) {
                      consoleDiv.innerHTML = '<strong class="error">❌ Error:</strong>\\n' + err.message;
                      console.error(err);
                    }
                  })();
                </script>
              </body>
            </html>
          `;

          doc.open();
          doc.write(html);
          doc.close();
        } catch (err: any) {
          setError(err.message);
        }
      }
    }
  };
  const executeHTML = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        try {
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:white;}</style>
              </head>
              <body>${code}</body>
            </html>
          `);
          doc.close();
        } catch (err: any) {
          setError(err.message);
        }
      }
    }
  };

  const executeCSS = () => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        try {
          const demoHTML = generateDemoHTML(code);
          doc.open();
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#f5f5f5;}
                  ${code}
                </style>
              </head>
              <body>${demoHTML}</body>
            </html>
          `);
          doc.close();
        } catch (err: any) {
          setError(err.message);
        }
      }
    }
  };

  const generateDemoHTML = (css: string): string => {
    const allClasses = [...css.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
    const blockClasses = allClasses.filter((c) => !c.includes("__") && !c.includes("--"));
    const uniqueBlocks = [...new Set(blockClasses)];

    if (uniqueBlocks.length === 0)
      return '<div style="padding:20px;color:#999;">Sin clases detectadas.</div>';

    const mainBlock = uniqueBlocks[0];
    return `
      <div style="padding: 20px;">
        <div class="${mainBlock}">
          <h2 class="${mainBlock}__title">Ejemplo de ${mainBlock}</h2>
          <p class="${mainBlock}__text">Contenido generado automáticamente.</p>
          <button class="${mainBlock}__button">Acción</button>
        </div>
      </div>
    `;
  };

  const resetCode = () => {
    // 1. Restauramos el código al valor original de la lección (prop)
    setCode(initialCode);

    // 2. Limpiamos logs de consola y errores anteriores
    setOutput([]);
    setError(null);

    // 3. NO llamamos a executeCode() aquí manualmente.
    // Dejamos que el useEffect([code]) detecte el cambio y actualice
    // el preview automáticamente. Esto evita que se ejecute código viejo.
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isPreviewLanguage = language === "html" || language === "css";
  const isJavaScript = ["javascript", "js", "typescript", "ts"].includes(language);

  return (
    <div
      className={`my-6 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 ${
        // AHORA: Aumentamos la base a 600px
        isExpanded ? "h-[95vh]" : "h-[600px]"
      } flex flex-col`}
    >
      {/* Header (Mantenido igual) */}
      <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400 font-mono">{language}</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border border-neutral-700 rounded px-2 py-1">
            <button
              onClick={() => {
                setViewMode("code");
                setDividerPos(50);
              }}
              className={`text-xs px-2 py-1 rounded transition-colors ${viewMode === "code" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              Code
            </button>
            <button
              onClick={() => {
                setViewMode("preview");
                setDividerPos(50);
              }}
              className={`text-xs px-2 py-1 rounded transition-colors ${viewMode === "preview" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode("both")}
              className={`text-xs px-2 py-1 rounded transition-colors ${viewMode === "both" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              Both
            </button>
          </div>

          <button
            onClick={resetCode}
            className="text-neutral-400 hover:text-white p-1"
            title="Resetear código"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={copyCode}
            className={`p-1 transition-colors ${
              isCopied ? "text-green-400" : "text-neutral-400 hover:text-white"
            }`}
            title={isCopied ? "¡Copiado!" : "Copiar código"}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {isCopied ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              )}
            </svg>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-neutral-400 hover:text-white p-1"
          >
            {/* Icono expandir */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          {isJavaScript && (
            <button
              onClick={executeCode}
              disabled={isRunning}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              Ejecutar
            </button>
          )}
        </div>
      </div>

      {/* Editor Area Wrapper - AQUÍ CONECTAMOS EL REF */}
      <div ref={editorAreaRef} className="overflow-hidden flex-1 flex flex-col relative">
        {viewMode === "code" && (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        )}

        {viewMode === "preview" &&
          (isPreviewLanguage || isJavaScript ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full bg-white border-0"
              title="Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="p-4 bg-neutral-900 h-full overflow-auto text-green-400 font-mono text-sm">
              {output.length
                ? output.map((l, i) => <div key={i}>{l}</div>)
                : "Ejecuta el código..."}
            </div>
          ))}

        {viewMode === "both" && (
          <div
            className="grid gap-0 h-full w-full"
            // 4. USAMOS 'auto' para el divisor y 'minmax' para el preview para evitar overflow
            style={{ gridTemplateRows: `${dividerPos}% auto minmax(0, 1fr)` }}
          >
            {/* Code Panel */}
            <div className="overflow-hidden bg-[#1e1e1e]">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Divider */}
            <div
              onMouseDown={() => setIsDragging(true)}
              className="h-2 bg-neutral-800 hover:bg-blue-600 cursor-row-resize flex items-center justify-center transition-colors z-10"
            >
              {/* Opcional: un pequeño 'grip' visual */}
              <div className="w-8 h-1 bg-neutral-600 rounded-full opacity-50 pointer-events-none" />
            </div>

            {/* Preview Panel */}
            <div className="bg-neutral-900 overflow-hidden flex flex-col h-full">
              {isPreviewLanguage || isJavaScript ? (
                <iframe
                  ref={iframeRef}
                  className="w-full h-full bg-white border-0"
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              ) : (
                <div className="p-4 overflow-auto h-full">
                  <div className="text-xs text-neutral-400 mb-2 font-semibold">
                    CONSOLA:
                  </div>
                  {error ? (
                    <div className="text-red-400 text-sm font-mono">❌ {error}</div>
                  ) : output.length > 0 ? (
                    <div className="space-y-1">
                      {output.map((line, i) => (
                        <div
                          key={i}
                          className="text-green-400 text-sm font-mono whitespace-pre-wrap"
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-neutral-500 text-sm italic">
                      Haz clic en "Ejecutar"...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info footer (Mantenido igual, es solo visual) */}
      <div className="bg-neutral-900 px-4 py-2 border-t border-neutral-800 text-xs text-neutral-500 shrink-0">
        {isPreviewLanguage ? "✨ Preview en vivo" : "💡 Edita y ejecuta"}
      </div>
    </div>
  );
}
