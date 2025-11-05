import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface QRCodeComponentProps {
  value: string;
  size?: number;
  logoSize?: number;
  logoUrl?: string;
  className?: string;
  showDownloadButton?: boolean;
  downloadFileName?: string;
  skipLogoOnDownload?: boolean;
}

const QRCodeComponent: React.FC<QRCodeComponentProps> = ({
  value,
  size = 300,
  logoSize = 60,
  logoUrl = "/logos/popchain_logo.png",
  className = "",
  showDownloadButton = true,
  downloadFileName = "qr-code",
  skipLogoOnDownload = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Generate QR code
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Error generating QR code:", err);
        setError("Failed to generate QR code");
        setIsLoading(false);
      }
    };

    generateQRCode();
  }, [value, size]);

  const handleDownload = async () => {
    if (!canvasRef.current) {
      setError("Canvas not available for download");
      return;
    }

    try {
      setIsDownloading(true);
      setError(null);

      // Create a new canvas for download
      const downloadCanvas = document.createElement("canvas");
      const downloadCtx = downloadCanvas.getContext("2d");

      if (!downloadCtx) {
        setError("Failed to create canvas context");
        setIsDownloading(false);
        return;
      }

      // Set canvas size
      downloadCanvas.width = size;
      downloadCanvas.height = size;

      // Generate QR code on the download canvas
      await QRCode.toCanvas(downloadCanvas, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Add logo overlay if not skipped
      if (logoUrl && !skipLogoOnDownload) {
        try {
          const logoImg = document.createElement("img");
          logoImg.crossOrigin = "anonymous";

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Logo load timeout"));
            }, 5000);

            logoImg.onload = () => {
              clearTimeout(timeout);
              try {
                // Calculate logo position (center)
                const logoX = (size - logoSize) / 2;
                const logoY = (size - logoSize) / 2;

                // Draw white background for logo
                downloadCtx.fillStyle = "#FFFFFF";
                downloadCtx.fillRect(
                  logoX - 8,
                  logoY - 8,
                  logoSize + 16,
                  logoSize + 16
                );

                // Draw logo
                downloadCtx.drawImage(
                  logoImg,
                  logoX,
                  logoY,
                  logoSize,
                  logoSize
                );
                resolve();
              } catch (err) {
                reject(err);
              }
            };

            logoImg.onerror = () => {
              clearTimeout(timeout);
              reject(new Error("Failed to load logo"));
            };

            logoImg.src = logoUrl;
          });
        } catch (err) {
          console.warn("Failed to load logo for download:", err);
          // Continue without logo - don't block the download
        }
      }

      // Convert canvas to blob and download
      await new Promise<void>((resolve, reject) => {
        downloadCanvas.toBlob(
          (blob) => {
            try {
              if (!blob) {
                reject(new Error("Failed to create blob from canvas"));
                return;
              }

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${downloadFileName}.png`;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);

              // Small delay to ensure download starts before revoking URL
              setTimeout(() => {
                URL.revokeObjectURL(url);
                resolve();
              }, 100);
            } catch (err) {
              reject(err);
            }
          },
          "image/png",
          1.0
        );
      });
    } catch (err) {
      console.error("Error downloading QR code:", err);
      setError(
        err instanceof Error ? err.message : "Failed to download QR code"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-red-500 text-sm">Error generating QR code</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <div className="relative" style={{ width: size, height: size }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className="rounded-xl"
            style={{ display: isLoading ? "none" : "block" }}
          />

          {/* Logo overlay */}
          {!isLoading && logoUrl && (
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-2 shadow-lg"
              style={{ width: logoSize, height: logoSize }}
            >
              <img
                src={logoUrl}
                alt="Logo"
                width={logoSize - 16}
                height={logoSize - 16}
                className="rounded-md object-cover"
              />
            </div>
          )}
        </div>
      </div>
      {/* Download button */}
      {showDownloadButton && !isLoading && !error && (
        <Button onClick={handleDownload} size="sm" className="btn-gradient">
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default QRCodeComponent;
