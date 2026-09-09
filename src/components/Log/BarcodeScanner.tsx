import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { IconArrowLeft } from "../icons";

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let controls: { stop: () => void } | null = null;
    const reader = new BrowserMultiFormatReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (cancelled || !result) return;
        cancelled = true;
        controls?.stop();
        onDetected(result.getText());
      })
      .then((c) => {
        if (cancelled) {
          c.stop();
          return;
        }
        controls = c;
      })
      .catch((err) => {
        setError(
          err?.name === "NotAllowedError"
            ? "Camera access was denied - allow camera access in your browser settings to scan a barcode."
            : "Couldn't access the camera on this device.",
        );
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="screen-overlay barcode-scanner-overlay">
      <div className="screen-header barcode-scanner-header">
        <button className="screen-back-btn" onClick={onClose} aria-label="Back">
          <IconArrowLeft className="icon icon-lg" />
        </button>
        <h3 style={{ fontSize: 16, color: "#fff" }}>Scan barcode</h3>
      </div>

      {error ? (
        <div className="barcode-scanner-error">
          <p>{error}</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="barcode-scanner-video" muted playsInline />
          <div className="barcode-scanner-frame" />
          <p className="barcode-scanner-hint">Line up the barcode inside the frame</p>
        </>
      )}
    </div>
  );
}
