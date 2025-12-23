import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { CameraIcon, SwitchCameraIcon, GridIcon, GridOffIcon, SlidersIcon, SunIcon, EyeIcon, UploadIcon } from './Icons';

export interface CameraHandle {
  triggerCapture: () => void;
  toggleCamera: () => void;
}

interface CameraProps {
  onCapture: (imageSrc: string) => void;
}

// Extend typical MediaTrackCapabilities for TS if needed, though most browsers handle it
interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step: number };
  focusDistance?: { min: number; max: number; step: number };
  colorTemperature?: { min: number; max: number; step: number };
  focusMode?: string[];
  whiteBalanceMode?: string[];
}

// Extend MediaTrackConstraints to include non-standard properties
interface ExtendedMediaTrackConstraints extends MediaTrackConstraints {
  zoom?: boolean | number | ConstrainDouble;
  focusMode?: string | string[] | ConstrainDOMString;
  focusDistance?: number | ConstrainDouble;
  whiteBalanceMode?: string | string[] | ConstrainDOMString;
  colorTemperature?: number | ConstrainDouble;
}

export const Camera = forwardRef<CameraHandle, CameraProps>(({ onCapture }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string>('');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Capabilities & Settings State
  const [capabilities, setCapabilities] = useState<ExtendedMediaTrackCapabilities | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [focusMode, setFocusMode] = useState<string>('continuous');
  const [focusDistance, setFocusDistance] = useState<number>(0);
  const [wbMode, setWbMode] = useState<string>('continuous');
  const [colorTemp, setColorTemp] = useState<number>(5000);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints: ExtendedMediaTrackConstraints = { 
        facingMode: facingMode, 
        width: { ideal: 1920 }, 
        height: { ideal: 1080 },
        // Requesting these specifically can sometimes help initial capability loading
        zoom: true 
      };

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
      
      // Load Capabilities
      const track = newStream.getVideoTracks()[0];
      if (track.getCapabilities) {
          const caps = track.getCapabilities() as ExtendedMediaTrackCapabilities;
          setCapabilities(caps);
          
          const settings = track.getSettings();
          // @ts-ignore
          if (settings.zoom) setZoom(settings.zoom);
          // @ts-ignore
          if (settings.focusMode) setFocusMode(settings.focusMode);
          // @ts-ignore
          if (settings.focusDistance) setFocusDistance(settings.focusDistance);
          // @ts-ignore
          if (settings.whiteBalanceMode) setWbMode(settings.whiteBalanceMode);
          // @ts-ignore
          if (settings.colorTemperature) setColorTemp(settings.colorTemperature);
      }

    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error(err);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const applyConstraint = async (constraints: ExtendedMediaTrackConstraints) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
        await track.applyConstraints({ advanced: [constraints as any] });
    } catch (e) {
        console.warn("Failed to apply constraint:", constraints, e);
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setZoom(val);
      applyConstraint({ zoom: val } as ExtendedMediaTrackConstraints);
  };

  const handleFocusModeChange = (mode: string) => {
      setFocusMode(mode);
      applyConstraint({ focusMode: mode } as ExtendedMediaTrackConstraints);
  };

  const handleFocusDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setFocusDistance(val);
      // Usually requires manual mode to work
      applyConstraint({ focusMode: 'manual', focusDistance: val } as ExtendedMediaTrackConstraints);
      setFocusMode('manual');
  };

  const handleWbModeChange = (mode: string) => {
      setWbMode(mode);
      applyConstraint({ whiteBalanceMode: mode } as ExtendedMediaTrackConstraints);
  };

  const handleColorTempChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setColorTemp(val);
      applyConstraint({ whiteBalanceMode: 'manual', colorTemperature: val } as ExtendedMediaTrackConstraints);
      setWbMode('manual');
  };

  const capture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Flip horizontally if using user camera
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageSrc);
      }
    }
  }, [onCapture, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // Reset settings on switch
    setZoom(1);
    setShowSettings(false);
  };

  const toggleGrid = () => {
    setShowGrid(prev => !prev);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    triggerCapture: capture,
    toggleCamera: toggleCamera
  }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onCapture(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
      {error ? (
        <div className="flex-1 flex items-center justify-center p-4 text-center text-red-400">
          {error}
        </div>
      ) : (
        <div className="relative flex-1 w-full h-full overflow-hidden group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-all duration-700 ${facingMode === 'user' ? 'scale-x-[-1]' : ''} sepia-[0.3] contrast-[1.1] saturate-[0.8]`}
          />
          {/* Vintage Vignette Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_40%,rgba(20,10,5,0.4)_100%)] shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] mix-blend-multiply z-10" />
          
          {/* Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none z-10 opacity-60">
              <div className="absolute top-1/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.8)]"></div>
              <div className="absolute top-2/3 left-0 w-full h-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.8)]"></div>
              <div className="absolute left-1/3 top-0 h-full w-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.8)]"></div>
              <div className="absolute left-2/3 top-0 h-full w-px bg-white/50 shadow-[0_0_2px_rgba(0,0,0,0.8)]"></div>
            </div>
          )}

          {/* Top Right Controls */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
             {/* Settings Toggle */}
             {(capabilities?.zoom || capabilities?.focusMode || capabilities?.whiteBalanceMode) && (
                 <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-full backdrop-blur transition shadow-lg border border-white/5 ${showSettings ? 'bg-cyan-600 text-white' : 'bg-slate-800/40 text-white hover:bg-slate-700/60'}`}
                    title="Camera Settings"
                 >
                    <SlidersIcon />
                 </button>
             )}

             {/* Grid Toggle */}
             <button 
                onClick={toggleGrid}
                className="p-3 rounded-full bg-slate-800/40 backdrop-blur text-white hover:bg-slate-700/60 transition shadow-lg border border-white/5"
                title={showGrid ? "Hide Grid" : "Show Grid"}
             >
                {showGrid ? <GridIcon /> : <GridOffIcon />}
             </button>
          </div>

          {/* Settings Panel */}
          {showSettings && capabilities && (
              <div className="absolute bottom-32 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 z-30 animate-in slide-in-from-bottom-5">
                  <div className="space-y-4">
                      {/* Zoom Control */}
                      {capabilities.zoom && (
                          <div className="flex items-center gap-3">
                              <span className="text-white/70 text-xs uppercase font-bold w-12">Zoom</span>
                              <input 
                                type="range" 
                                min={capabilities.zoom.min} 
                                max={capabilities.zoom.max} 
                                step={capabilities.zoom.step} 
                                value={zoom}
                                onChange={handleZoomChange}
                                className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                              />
                              <span className="text-white/90 text-xs w-8 text-right">{zoom.toFixed(1)}x</span>
                          </div>
                      )}

                      {/* Focus Control */}
                      {(capabilities.focusMode?.includes('manual') || capabilities.focusDistance) && (
                           <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                   <div className="flex items-center gap-2 text-white/70 text-xs uppercase font-bold">
                                       <EyeIcon className="w-3 h-3" /> Focus
                                   </div>
                                   {capabilities.focusMode && (
                                       <div className="flex bg-slate-800 rounded-lg p-0.5">
                                           <button 
                                               onClick={() => handleFocusModeChange('continuous')}
                                               className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${focusMode === 'continuous' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                           >
                                               AUTO
                                           </button>
                                           <button 
                                                onClick={() => handleFocusModeChange('manual')}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${focusMode === 'manual' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                            >
                                                MANUAL
                                            </button>
                                       </div>
                                   )}
                               </div>
                               {focusMode === 'manual' && capabilities.focusDistance && (
                                   <div className="flex items-center gap-3">
                                       <span className="text-white/50 text-[10px] w-8">Near</span>
                                       <input 
                                            type="range" 
                                            min={capabilities.focusDistance.min} 
                                            max={capabilities.focusDistance.max} 
                                            step={capabilities.focusDistance.step} 
                                            value={focusDistance}
                                            onChange={handleFocusDistanceChange}
                                            className="flex-1 accent-cyan-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                       <span className="text-white/50 text-[10px] w-8 text-right">Far</span>
                                   </div>
                               )}
                           </div>
                      )}

                      {/* White Balance Control */}
                      {(capabilities.whiteBalanceMode?.includes('manual') || capabilities.colorTemperature) && (
                           <div className="space-y-2">
                               <div className="flex justify-between items-center">
                                   <div className="flex items-center gap-2 text-white/70 text-xs uppercase font-bold">
                                       <SunIcon className="w-3 h-3" /> White Bal
                                   </div>
                                   {capabilities.whiteBalanceMode && (
                                       <div className="flex bg-slate-800 rounded-lg p-0.5">
                                           <button 
                                               onClick={() => handleWbModeChange('continuous')}
                                               className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${wbMode === 'continuous' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                           >
                                               AUTO
                                           </button>
                                           <button 
                                                onClick={() => handleWbModeChange('manual')}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${wbMode === 'manual' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                                            >
                                                MANUAL
                                            </button>
                                       </div>
                                   )}
                               </div>
                               {wbMode === 'manual' && capabilities.colorTemperature && (
                                   <div className="flex items-center gap-3">
                                       <span className="text-blue-300 text-[10px] w-8">Cool</span>
                                       <input 
                                            type="range" 
                                            min={capabilities.colorTemperature.min} 
                                            max={capabilities.colorTemperature.max} 
                                            step={capabilities.colorTemperature.step} 
                                            value={colorTemp}
                                            onChange={handleColorTempChange}
                                            className="flex-1 accent-cyan-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                       <span className="text-orange-300 text-[10px] w-8 text-right">Warm</span>
                                   </div>
                               )}
                           </div>
                      )}
                  </div>
              </div>
          )}
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera Controls */}
      <div className="absolute bottom-0 w-full p-8 pb-12 bg-gradient-to-t from-black/90 to-transparent flex justify-around items-center z-20">
        {/* Upload Button */}
         <label className="p-3 rounded-full bg-slate-800/50 backdrop-blur text-white cursor-pointer hover:bg-slate-700 transition group border border-white/10 shadow-lg" title="Upload from Device">
            <UploadIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
         </label>

        {/* Shutter Button */}
        <button
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white bg-transparent flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
          aria-label="Take photo"
        >
          <div className="w-16 h-16 rounded-full bg-white/90" />
        </button>

        {/* Switch Camera */}
        <button
          onClick={toggleCamera}
          className="p-3 rounded-full bg-slate-800/50 backdrop-blur text-white hover:bg-slate-700 transition"
          aria-label="Switch camera"
        >
          <SwitchCameraIcon />
        </button>
      </div>
    </div>
  );
});
Camera.displayName = 'Camera';