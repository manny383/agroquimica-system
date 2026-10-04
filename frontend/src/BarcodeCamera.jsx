import React, { useEffect, useRef, useState } from "react";

export function BarcodeCameraButton({ onDetected, disabled = false }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" disabled={disabled} onClick={() => setOpen(true)}>Escanear con cámara</button>
    {open && <CameraScanner onDetected={(code) => { setOpen(false); onDetected(code); }} onClose={() => setOpen(false)} />}
  </>;
}

function CameraScanner({ onDetected, onClose }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const detectedRef = useRef(onDetected);
  detectedRef.current = onDetected;
  const [message, setMessage] = useState("Abriendo cámara…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    dialogRef.current.showModal();
    let cancelled = false;
    let completed = false;
    let stream;
    let controls;
    const stop = () => {
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Para usar la cámara, abre la app mediante HTTPS o localhost.");
        }
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
        if (cancelled) { stop(); return; }
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 200 });
        controls = await reader.decodeFromStream(stream, videoRef.current, (result, _error, scanControls) => {
          if (!result || cancelled || completed) return;
          completed = true;
          scanControls.stop();
          stop();
          detectedRef.current(result.getText());
        });
        if (cancelled || completed) { stop(); return; }
        setMessage("Apunta al código de barras y mantén el teléfono quieto. La lectura cerrará la cámara.");
      } catch (error) {
        stop();
        if (cancelled) return;
        const messages = {
          NotAllowedError: "Permite el acceso a la cámara en el navegador y vuelve a intentarlo.",
          NotFoundError: "No se encontró una cámara. Puedes usar un lector USB o ingresar el código manualmente.",
          NotReadableError: "No se pudo abrir la cámara. Cierra otras aplicaciones que la estén usando y vuelve a intentarlo.",
        };
        setMessage(messages[error.name] || error.message || "No se pudo iniciar el escáner.");
        setFailed(true);
      }
    }
    start();
    return () => { cancelled = true; stop(); };
  }, []);

  return <dialog ref={dialogRef} className="barcode-camera-dialog" aria-labelledby="camera-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2 id="camera-title">Escanear código de barras</h2>
    <video ref={videoRef} autoPlay muted playsInline aria-label="Vista de la cámara" />
    <p role={failed ? "alert" : "status"}>{message}</p>
    <p>El código se cargará para que lo revises. El escaneo no guarda productos ni movimientos.</p>
    <button type="button" onClick={onClose}>Cerrar cámara</button>
  </dialog>;
}

export function BarcodeInput({ required = false, placeholder = "Escanea el código del producto" }) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");
  return <div className="compact-form">
    <label>Código de barras{required ? "" : " (opcional)"}
      <input ref={inputRef} name="codigoBarras" required={required} maxLength="100" placeholder={placeholder} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
    </label>
    <BarcodeCameraButton onDetected={(code) => {
      if (code.length > 100) { setMessage("El código supera los 100 caracteres permitidos."); return; }
      inputRef.current.value = code;
      inputRef.current.focus();
      setMessage(`Código leído: ${code}. Revisa los datos antes de guardar.`);
    }} />
    {message && <p role="status">{message}</p>}
  </div>;
}
