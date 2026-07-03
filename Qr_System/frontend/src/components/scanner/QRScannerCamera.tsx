import React, { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useZxing } from 'react-zxing'; // Alternative to react-qr-barcode-scanner that's very stable

interface QRScannerCameraProps {
  onScan: (data: string) => void;
  isLoading: boolean;
}

const QRScannerCamera: React.FC<QRScannerCameraProps> = ({ onScan, isLoading }) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  const { ref } = useZxing({
    onDecodeResult(result) {
      if (!isLoading) {
        onScan(result.getText());
      }
    },
    onError(error) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError') {
         setCameraError('Camera access denied.');
      }
    }
  });

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Camera className="w-16 h-16 text-gray-400" />
        <h3 className="text-lg font-bold">Camera Access Denied</h3>
        <p className="text-sm text-gray-500">Please allow camera access in your settings, or manually enter the QR ID.</p>
        <div className="w-full max-w-xs mt-4">
          <input 
            type="text" 
            placeholder="Enter Participant QR ID..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
          />
          <button 
            className="w-full mt-3 bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
            onClick={() => onScan(manualInput)}
            disabled={!manualInput || isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Submit Manual ID'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden bg-black aspect-[3/4] sm:aspect-video rounded-xl flex items-center justify-center">
       <video ref={ref} className="w-full h-full object-cover" />
       {isLoading && (
         <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
           <Loader2 className="w-12 h-12 text-white animate-spin" />
         </div>
       )}
       {/* Scanner Guide Overlay */}
       <div className="absolute inset-0 pointer-events-none custom-scanner-reticle" />
    </div>
  );
};

export default QRScannerCamera;
