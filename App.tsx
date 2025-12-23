
import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraHandle } from './components/Camera';
import { EraSelector } from './components/EraSelector';
import { AppState, Era, AnalysisResult, MusicTrack, VideoResolution, VideoAspectRatio, HistoryItem } from './types';
import { analyzeImage, generateTimeTravelImage, editImageWithPrompt, generateVideoFromImage, generateImageCaption } from './services/geminiService';
import { SparklesIcon, RefreshIcon, DownloadIcon, WandIcon, CameraIcon, MovieIcon, ShareIcon, MicIcon, MicOffIcon, MusicNoteIcon, PlusIcon, TrashIcon, ZapIcon, ArrowLeftIcon, UndoIcon, RedoIcon, LogoIcon, HistoryIcon, XIcon, HomeIcon } from './components/Icons';
import { HISTORICAL_ERAS, MUSIC_TRACKS, FEATURE_CARDS } from './constants';

// --- Filters Configuration ---
const FILTERS = [
  { id: 'normal', name: 'Normal', style: 'none' },
  { id: 'bw', name: 'B&W', style: 'grayscale(100%) contrast(110%)' },
  { id: 'sepia', name: 'Sepia', style: 'sepia(100%)' },
  { id: 'vintage', name: 'Vintage', style: 'sepia(50%) contrast(120%) saturate(80%)' },
  { id: 'noir', name: 'Noir', style: 'grayscale(100%) contrast(150%) brightness(90%)' },
  { id: 'chrome', name: 'Chrome', style: 'grayscale(100%) contrast(140%) brightness(110%)' },
  { id: 'vivid', name: 'Vivid', style: 'saturate(150%) contrast(110%)' },
  { id: 'matte', name: 'Matte', style: 'contrast(80%) brightness(120%) saturate(90%)' },
  { id: 'cinematic', name: 'Cinematic', style: 'sepia(20%) contrast(120%) saturate(110%) hue-rotate(-10deg)' },
  { id: 'warm', name: 'Warm', style: 'sepia(30%) contrast(100%) hue-rotate(-15deg)' },
  { id: 'golden', name: 'Golden', style: 'sepia(40%) saturate(140%) brightness(110%)' },
  { id: 'cool', name: 'Cool', style: 'hue-rotate(30deg) contrast(110%)' },
  { id: 'pastel', name: 'Pastel', style: 'contrast(90%) brightness(110%) saturate(110%) sepia(10%)' },
  { id: 'fade', name: 'Fade', style: 'contrast(85%) brightness(110%) saturate(80%)' },
];

const STORAGE_KEY = 'chronobooth_autosave_v1';

// Helper to apply CSS filter to base64 image using Canvas
const applyFilterToImage = async (imgSrc: string, filterStyle: string): Promise<string> => {
  if (filterStyle === 'none') return imgSrc;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = filterStyle;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } else {
        // Fallback if canvas context fails
        resolve(imgSrc);
      }
    };
    img.onerror = () => resolve(imgSrc);
    img.src = imgSrc;
  });
};

interface CommonUIProps {
  children: React.ReactNode;
  isListening: boolean;
  onToggleListening: () => void;
  lastCommand: string;
}

const CommonUI: React.FC<CommonUIProps> = ({ children, isListening, onToggleListening, lastCommand }) => (
     <>
        {children}
        
        {/* Voice Control Floating Button */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {/* Last Command Feedback Toast */}
            {lastCommand && (
                <div className="bg-black/70 backdrop-blur text-white px-4 py-2 rounded-lg text-sm border border-white/10 animate-in slide-in-from-bottom-2 fade-in">
                    "{lastCommand}"
                </div>
            )}
            
            <button
                onClick={onToggleListening}
                className={`p-4 rounded-full shadow-lg transition-all active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                title={isListening ? "Listening... Click to stop" : "Click to enable Voice Control"}
            >
                {isListening ? <MicIcon /> : <MicOffIcon />}
            </button>
        </div>
     </>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.SPLASH);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [selectedEra, setSelectedEra] = useState<Era | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditInput, setShowEditInput] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Traveling through time...");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customEraPrompt, setCustomEraPrompt] = useState('');
  
  // Caption State
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  // History for Undo/Redo
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [redoHistory, setRedoHistory] = useState<string[]>([]);
  
  // Generation History (Session Gallery)
  const [generationHistory, setGenerationHistory] = useState<HistoryItem[]>([]);
  const [totalGeneratedCount, setTotalGeneratedCount] = useState<number>(0);

  // Video Generation Settings
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>('9:16');

  // Voice Command State
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  
  // Camera Ref to trigger capture from Voice
  const cameraRef = useRef<CameraHandle>(null);

  // New State for Filter
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  // State for Music
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Ref to hold current state for the speech recognition callback closure
  const stateRef = useRef({ 
    appState, 
    capturedImage, 
    generatedImage, 
    generatedVideo, 
    selectedEra,
    isGenerating,
    isAnalyzing
  });

  // Update ref when state changes
  useEffect(() => {
    stateRef.current = { 
      appState, 
      capturedImage, 
      generatedImage, 
      generatedVideo, 
      selectedEra,
      isGenerating,
      isAnalyzing
    };
  }, [appState, capturedImage, generatedImage, generatedVideo, selectedEra, isGenerating, isAnalyzing]);

  // --- Auto-Save & Restore Logic ---

  // Restore state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        // Validate essential fields before restoring
        if (parsed.appState) {
          
          setCapturedImage(parsed.capturedImage || null);
          setGeneratedImage(parsed.generatedImage || null);
          setSelectedEra(parsed.selectedEra || null);
          setAnalysis(parsed.analysis || null);
          setActiveFilter(parsed.activeFilter || FILTERS[0]);
          setSelectedMusic(parsed.selectedMusic || null);
          setEditPrompt(parsed.editPrompt || '');
          setVideoResolution(parsed.videoResolution || '720p');
          setVideoAspectRatio(parsed.videoAspectRatio || '9:16');
          setEditHistory(parsed.editHistory || []);
          setRedoHistory(parsed.redoHistory || []);
          setGenerationHistory(parsed.generationHistory || []);
          setTotalGeneratedCount(parsed.totalGeneratedCount || 0);
          setSelectedFeatureId(parsed.selectedFeatureId || null);
          setCustomEraPrompt(parsed.customEraPrompt || '');
          setGeneratedCaption(parsed.generatedCaption || null);

          // Handle state restoration carefully
          // If we were processing, revert to a safe state since the process is dead
          if (parsed.appState === AppState.PROCESSING) {
             if (parsed.generatedImage) {
                 setAppState(AppState.RESULT);
             } else if (parsed.capturedImage) {
                 setAppState(AppState.PREVIEW);
             } else {
                 setAppState(AppState.DASHBOARD);
             }
          } else {
             setAppState(parsed.appState);
          }
          
          console.log("Restored session from LocalStorage");
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save state on significant changes
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      // Only save if we are not in ephemeral states like SPLASH
      if (appState !== AppState.SPLASH) {
           const stateToSave = {
              appState,
              capturedImage,
              generatedImage,
              selectedEra,
              analysis,
              activeFilter,
              editPrompt,
              selectedMusic,
              videoResolution,
              videoAspectRatio,
              editHistory,
              redoHistory,
              generationHistory,
              totalGeneratedCount,
              selectedFeatureId,
              customEraPrompt,
              generatedCaption
           };
           try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
           } catch (e) {
              console.warn("LocalStorage quota exceeded, cannot auto-save session.");
           }
      }
    }, 1000); // Debounce save by 1s

    return () => clearTimeout(saveTimeout);
  }, [appState, capturedImage, generatedImage, selectedEra, analysis, activeFilter, editPrompt, selectedMusic, videoResolution, videoAspectRatio, editHistory, redoHistory, generationHistory, totalGeneratedCount, selectedFeatureId, customEraPrompt, generatedCaption]);


  // Handle Splash Screen Timer
  useEffect(() => {
    if (appState === AppState.SPLASH) {
      const timer = setTimeout(() => {
        setAppState(AppState.DASHBOARD);
      }, 3000); // 3 seconds total for splash
      return () => clearTimeout(timer);
    }
  }, [appState]);

  // Sync Audio with Video
  const handleVideoPlay = () => {
    if (audioRef.current && selectedMusic) {
      audioRef.current.play().catch(e => console.log("Audio play failed interaction required", e));
    }
  };

  const handleVideoPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleVideoEnded = () => {
     if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
     }
  };

  const handleVideoSeek = () => {
    if (videoPlayerRef.current && audioRef.current) {
      audioRef.current.currentTime = videoPlayerRef.current.currentTime;
    }
  };

  // 1. Capture Image
  const handleCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setAppState(AppState.PREVIEW);
    setAnalysis(null); // Reset analysis
    setActiveFilter(FILTERS[0]); // Reset filter to Normal
  };

  // 2. Analyze Image (Optional Feature 1)
  const handleAnalyze = async () => {
    // Read from ref if called from voice to ensure freshness, otherwise state is fine
    const currentImage = capturedImage || stateRef.current.capturedImage;
    if (!currentImage) return;

    setIsAnalyzing(true);
    try {
      // Use the raw captured image for analysis to get best accuracy
      const result = await analyzeImage(currentImage);
      setAnalysis(result);
    } catch (e) {
      alert("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Select Era & Generate
  const handleSelectEra = async (era: Era) => {
    const currentImage = capturedImage || stateRef.current.capturedImage;
    const currentFilter = activeFilter; // Active filter state is usually fresh enough or we can use ref if needed
    
    if (!currentImage) return;
    
    setSelectedEra(era);
    setCustomEraPrompt(era.prompt); // Initialize custom prompt with era default
    setProcessingMessage(`Traveling to ${era.name}...`);
    setAppState(AppState.PROCESSING);
    setIsGenerating(true);

    try {
      // Bake the selected filter into the image before sending to Gemini
      const processedImage = await applyFilterToImage(currentImage, currentFilter.style);
      
      const resultImage = await generateTimeTravelImage(processedImage, era.prompt);
      setGeneratedImage(resultImage);
      
      // Update Generation History (Keep last 5)
      const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          imageUrl: resultImage,
          era: era,
          timestamp: Date.now()
      };
      setGenerationHistory(prev => [newHistoryItem, ...prev].slice(0, 5));
      setTotalGeneratedCount(prev => prev + 1);

      setEditHistory([]); // Reset history on new generation
      setRedoHistory([]); // Reset redo history
      setGeneratedVideo(null); // Reset video
      setSelectedMusic(null); // Reset music
      setGeneratedCaption(null); // Reset caption
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      alert("Time travel failed! The flux capacitor might be broken.");
      setAppState(AppState.PREVIEW);
    } finally {
      setIsGenerating(false);
    }
  };

  // 3.5 Load from History
  const handleLoadHistory = (item: HistoryItem) => {
      setGeneratedImage(item.imageUrl);
      setSelectedEra(item.era);
      setCustomEraPrompt(item.era.prompt); // Initialize custom prompt
      setGeneratedVideo(null);
      setEditHistory([]);
      setRedoHistory([]);
      setSelectedMusic(null);
      setGeneratedCaption(null); // Clear old caption
      // We don't change capturedImage here as that's the "source", but we show the result.
      // This allows user to go back to preview with original captured image if they want.
  };

  // 3.6 Regenerate with Custom Prompt
  const handleRegenerate = async () => {
    const currentImage = capturedImage || stateRef.current.capturedImage;
    if (!currentImage || !selectedEra) return;
    
    setProcessingMessage(`Re-imagining ${selectedEra.name}...`);
    setAppState(AppState.PROCESSING);
    setIsGenerating(true);

    try {
      const processedImage = await applyFilterToImage(currentImage, activeFilter.style);
      // Use customEraPrompt for regeneration
      const resultImage = await generateTimeTravelImage(processedImage, customEraPrompt);
      
      setGeneratedImage(resultImage);
      
      const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          imageUrl: resultImage,
          era: selectedEra,
          timestamp: Date.now()
      };
      setGenerationHistory(prev => [newHistoryItem, ...prev].slice(0, 5));
      setTotalGeneratedCount(prev => prev + 1);

      setEditHistory([]);
      setRedoHistory([]);
      setGeneratedVideo(null);
      setSelectedMusic(null);
      setGeneratedCaption(null); // Reset caption
      setAppState(AppState.RESULT);
    } catch (error) {
      console.error(error);
      alert("Regeneration failed.");
      setAppState(AppState.RESULT); // Go back to result on error to show previous image
    } finally {
      setIsGenerating(false);
    }
  };

  // 3.7 Generate Caption
  const handleGenerateCaption = async () => {
    const currentGenImage = generatedImage || stateRef.current.generatedImage;
    if (!currentGenImage) return;

    setIsGeneratingCaption(true);
    try {
        const caption = await generateImageCaption(currentGenImage);
        setGeneratedCaption(caption);
    } catch (e) {
        alert("Could not generate caption.");
    } finally {
        setIsGeneratingCaption(false);
    }
  };

  // 4. Edit Image (Optional Feature 2)
  const handleEdit = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || editPrompt;
    
    if (!promptToUse.trim()) return;

    const currentGenImage = generatedImage || stateRef.current.generatedImage;
    if (!currentGenImage) return;
    
    setIsGenerating(true);
    try {
        const newImage = await editImageWithPrompt(currentGenImage, promptToUse);
        
        // Save current state to history before updating
        setEditHistory(prev => [...prev, currentGenImage]);
        setRedoHistory([]); // Clear redo history on new edit path
        
        setGeneratedImage(newImage);
        setGeneratedVideo(null); // Clear any existing video since we changed the image
        setGeneratedCaption(null); // Caption might be invalid now
        setEditPrompt('');
    } catch(e) {
        alert("Edit failed.");
    } finally {
        setIsGenerating(false);
    }
  };

  // 4.5 Undo Edit
  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const currentGenImage = generatedImage;
    if (!currentGenImage) return;

    const previousImage = editHistory[editHistory.length - 1];
    const newHistory = editHistory.slice(0, -1);
    
    setRedoHistory(prev => [...prev, currentGenImage]); // Push current to redo
    setGeneratedImage(previousImage);
    setEditHistory(newHistory);
    setGeneratedVideo(null); // Clear video on undo
    setGeneratedCaption(null);
  };

  // 4.6 Redo Edit
  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const currentGenImage = generatedImage;
    if (!currentGenImage) return;

    const nextImage = redoHistory[redoHistory.length - 1];
    const newRedoHistory = redoHistory.slice(0, -1);

    setEditHistory(prev => [...prev, currentGenImage]); // Push current to history
    setGeneratedImage(nextImage);
    setRedoHistory(newRedoHistory);
    setGeneratedVideo(null); // Clear video on redo
    setGeneratedCaption(null);
  };

  // 5. Animate with Veo (New Feature)
  const handleAnimate = async () => {
    const currentGenImage = generatedImage || stateRef.current.generatedImage;
    if (!currentGenImage) return;

    // Check for API Key first - assume successful if prompt opens or returns true
    try {
       // @ts-ignore
       if (window.aistudio && window.aistudio.hasSelectedApiKey) {
           // @ts-ignore
           const hasKey = await window.aistudio.hasSelectedApiKey();
           if (!hasKey) {
              // @ts-ignore
              await window.aistudio.openSelectKey();
           }
       }
    } catch(e) {
       console.log("Environment does not support key selection, proceeding...");
    }

    setProcessingMessage("Filming your scene on set... (This may take a minute)");
    setAppState(AppState.PROCESSING);
    setIsGenerating(true);

    try {
        const prompt = `Cinematic shot of this scene, ${stateRef.current.selectedEra?.name || 'historical setting'}, subtle motion, breathing, wind blowing, 4k detail, photorealistic.`;
        const videoUrl = await generateVideoFromImage(currentGenImage, prompt, {
          resolution: videoResolution,
          aspectRatio: videoAspectRatio
        });
        setGeneratedVideo(videoUrl);
        setAppState(AppState.RESULT);
    } catch (e: any) {
        console.error("Animation failed", e);
        
        const errorString = JSON.stringify(e);
        // Handle "Requested entity was not found" specific to Veo/Paid keys
        if (errorString.includes("Requested entity was not found") || errorString.includes("404")) {
             alert("Veo generation requires a specific Paid Project API key. Please select a valid project.");
             try {
                 // @ts-ignore
                 if (window.aistudio && window.aistudio.openSelectKey) {
                     // @ts-ignore
                     await window.aistudio.openSelectKey();
                 }
             } catch (keyError) {
                 console.error("Key selection failed", keyError);
             }
        } else {
             alert("Animation failed. Veo might be busy filming another movie.");
        }
        
        setAppState(AppState.RESULT); // Go back to result even if failed
    } finally {
        setIsGenerating(false);
    }
  };

  // 6. Share Functionality
  const handleShare = async () => {
    const fileUrl = generatedVideo || generatedImage;
    if (!fileUrl) return;

    try {
      const isVideo = !!generatedVideo;
      const fileName = `chronobooth-${selectedEra?.id || 'historical'}-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

      // Fetch the blob content
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'ChronoBooth Time Travel',
          text: `Check out my time travel to ${selectedEra?.name || 'history'}! Created with ChronoBooth.`,
          files: [file]
        });
      } else {
        alert("Native sharing is not supported on this device. Please use the Save button.");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert("Could not share content. Try saving instead.");
    }
  };

  // Reset Flow
  const reset = () => {
    // We do NOT clear localStorage here to preserve history and counts
    setCapturedImage(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setSelectedEra(null);
    setSelectedMusic(null);
    setAnalysis(null);
    setAppState(AppState.CAMERA);
    setShowPrompt(false);
    setActiveFilter(FILTERS[0]);
    setEditHistory([]);
    setRedoHistory([]);
    setGeneratedCaption(null);
    setProcessingMessage("Traveling through time...");
  };

  const goHome = () => {
    // We do NOT clear localStorage here to preserve history and counts
    setCapturedImage(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setSelectedEra(null);
    setSelectedMusic(null);
    setAnalysis(null);
    setAppState(AppState.DASHBOARD);
    setShowPrompt(false);
    setActiveFilter(FILTERS[0]);
    setEditHistory([]);
    setRedoHistory([]);
    setGeneratedCaption(null);
    setProcessingMessage("Traveling through time...");
    setSelectedFeatureId(null);
  };

  // --- Voice Control Logic ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
        setLastCommand(transcript);
        
        // Clear command feedback after 2s
        setTimeout(() => setLastCommand(''), 2000);

        const state = stateRef.current;
        console.log("Voice Command:", transcript, "State:", state.appState);

        // --- GLOBAL COMMANDS ---
        if (transcript.includes('home') || transcript.includes('dashboard')) {
            goHome();
            return;
        }
        if (transcript.includes('reset') || transcript.includes('start over')) {
            reset();
            return;
        }
        if (transcript.includes('stop listening')) {
            setIsListening(false);
            return;
        }

        // --- STATE SPECIFIC COMMANDS ---
        switch (state.appState) {
            case AppState.DASHBOARD:
                if (transcript.includes('camera') || transcript.includes('start')) {
                    setAppState(AppState.CAMERA);
                }
                break;
            
            case AppState.CAMERA:
                if (transcript.includes('capture') || transcript.includes('take') || transcript.includes('shoot') || transcript.includes('cheese') || transcript.includes('snap')) {
                    cameraRef.current?.triggerCapture();
                }
                if (transcript.includes('switch') || transcript.includes('flip')) {
                    cameraRef.current?.toggleCamera();
                }
                break;
            
            case AppState.PREVIEW:
                if (transcript.includes('analyze') || transcript.includes('describe')) {
                    handleAnalyze();
                }
                if (transcript.includes('retake')) {
                    reset();
                }
                // Filter Selection
                FILTERS.forEach(f => {
                    if (transcript.includes(f.name.toLowerCase())) {
                        setActiveFilter(f);
                    }
                });
                // Era Selection
                HISTORICAL_ERAS.forEach(era => {
                    if (transcript.includes(era.name.toLowerCase()) || transcript.includes(era.id.toLowerCase())) {
                        handleSelectEra(era);
                    }
                });
                break;

            case AppState.RESULT:
                if (transcript.includes('animate') || transcript.includes('video') || transcript.includes('movie')) {
                    handleAnimate();
                }
                if (transcript.includes('share')) {
                    handleShare();
                }
                if (transcript.includes('edit')) {
                   setShowEditInput(true);
                }
                if (transcript.includes('undo')) {
                    handleUndo();
                }
                if (transcript.includes('redo')) {
                    handleRedo();
                }
                break;
        }
    };

    recognition.onend = () => {
        if (isListening) {
            recognition.start();
        }
    };

    if (isListening) {
        recognition.start();
    } else {
        recognition.stop();
    }

    return () => {
        recognition.stop();
    };
  }, [isListening]);


  // -- RENDER HELPERS --

  if (appState === AppState.SPLASH) {
      return (
          <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
             <div className="relative flex flex-col items-center justify-center">
                 {/* Animated Logo */}
                 <div className="relative w-40 h-40 mb-8">
                     {/* Outer Ring - Time */}
                     <div className="absolute inset-0 border-[6px] border-t-cyan-500 border-r-transparent border-b-cyan-500 border-l-transparent rounded-full"
                          style={{ animation: 'logo-spin-outer 3s ease-out forwards' }} />
                     {/* Inner Ring - Space */}
                     <div className="absolute inset-6 border-[6px] border-t-purple-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full"
                          style={{ animation: 'logo-spin-inner 3s ease-out forwards' }} />
                     {/* Center - Lens/Singularity */}
                     <div className="absolute inset-0 m-auto w-4 h-4 bg-white rounded-full animate-ping opacity-75" />
                 </div>
                 
                 {/* Text Reveal */}
                 <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-500 tracking-tighter"
                     style={{ animation: 'text-reveal 1.5s cubic-bezier(0.77, 0, 0.175, 1) 0.5s forwards', opacity: 0 }}>
                     ChronoBooth
                 </h1>
                 
                 <div className="mt-4 flex gap-2" style={{ animation: 'text-reveal 1s ease-out 1.2s forwards', opacity: 0 }}>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce delay-75"/>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"/>
                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-300"/>
                 </div>
             </div>
          </div>
      );
  }

  if (appState === AppState.DASHBOARD) {
    return (
      <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
      <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in duration-1000">
        {/* Background Ambient Light */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />

        {/* Top Right History Button */}
        <div className="absolute top-6 right-6 z-30">
             <button 
                 onClick={() => setShowHistoryModal(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur rounded-full border border-white/10 transition text-slate-300 hover:text-white group"
             >
                 <HistoryIcon className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
                 <span className="hidden md:inline font-medium text-sm">History</span>
             </button>
        </div>

        <header className="mb-8 text-center relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 mb-6 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl rounded-full group-hover:blur-2xl transition-all duration-500" />
                <LogoIcon className="w-full h-full drop-shadow-2xl" />
            </div>
            
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-4 tracking-tight drop-shadow-sm">
                ChronoBooth
            </h1>
            <p className="text-slate-400 text-xl max-w-lg mx-auto leading-relaxed">
                Step into history. Analyze your world. Remake reality.
            </p>
        </header>

        {/* Feature Cards */}
        <div className="grid gap-6 w-full max-w-5xl grid-cols-1 md:grid-cols-3 mb-12 relative z-10">
            {FEATURE_CARDS.map((feature) => (
                <button 
                    key={feature.id}
                    onClick={() => {
                        setSelectedFeatureId(feature.id);
                        setAppState(AppState.FEATURE_DETAILS);
                    }}
                    className="group bg-slate-800/40 p-8 rounded-3xl border border-white/5 backdrop-blur-md hover:bg-slate-800/60 transition-all hover:-translate-y-1 duration-300 text-left"
                >
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color.replace('from-', 'from-').replace('to-', 'to-').replace('400', '900/80').replace('500', '900/80')} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                        {feature.icon === 'bolt' && <span className="text-2xl text-cyan-400">⚡</span>}
                        {feature.icon === 'sparkles' && <SparklesIcon className="w-7 h-7 text-purple-400" />}
                        {feature.icon === 'movie' && <MovieIcon className="w-7 h-7 text-pink-400" />}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{feature.description}</p>
                    <div className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors flex items-center gap-2">
                        Learn More <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </button>
            ))}
        </div>

        {/* Action Button */}
        <button
            onClick={() => setAppState(AppState.CAMERA)}
            className="group relative px-10 py-5 bg-white text-slate-950 font-bold text-xl rounded-full hover:scale-105 transition-all shadow-[0_0_50px_-10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_80px_-20px_rgba(6,182,212,0.6)] flex items-center gap-4 z-20"
        >
            <CameraIcon className="w-6 h-6" />
            <span>Open Camera</span>
            <span className="absolute inset-0 rounded-full ring-2 ring-white/50 animate-ping opacity-20 pointer-events-none"></span>
        </button>

        {/* User Stats / History Log (Bottom) */}
        {totalGeneratedCount > 0 && (
            <div className="w-full max-w-5xl mt-12 mb-4 relative z-10 animate-in slide-in-from-bottom-5 fade-in">
                 <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                     <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-full bg-cyan-900/30 flex items-center justify-center border border-cyan-500/20 text-2xl">
                                 🕰️
                             </div>
                             <div>
                                 <h3 className="text-white font-bold text-lg">Your Time Travel Log</h3>
                                 <div className="flex items-center gap-2">
                                     <span className="text-slate-400 text-xs uppercase tracking-wider">Total Jumps:</span>
                                     <span className="text-cyan-400 font-bold text-lg">{totalGeneratedCount}</span>
                                 </div>
                             </div>
                         </div>
                     </div>
                     
                     {/* Thumbnails */}
                     <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                          {generationHistory.map(item => (
                               <button 
                                  key={item.id}
                                  onClick={() => {
                                      handleLoadHistory(item);
                                      setAppState(AppState.RESULT);
                                  }}
                                  className="shrink-0 relative w-24 h-32 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400 hover:scale-105 transition-all group shadow-lg"
                               >
                                  <img src={item.imageUrl} className="w-full h-full object-cover" alt="History" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                  <div className="absolute bottom-2 left-2 right-2">
                                      <p className="text-[10px] text-cyan-300 font-bold truncate">{item.era.name}</p>
                                      <p className="text-[8px] text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</p>
                                  </div>
                               </button>
                          ))}
                     </div>
                 </div>
            </div>
        )}

         <div className="mt-16 text-slate-600 text-sm font-mono z-10">
            Powered by Google Gemini 2.5, 3.0 & Veo
        </div>

        {/* History Modal */}
        {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col relative shadow-2xl">
                     <div className="p-6 border-b border-white/10 flex justify-between items-center">
                         <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                             <HistoryIcon className="w-6 h-6 text-cyan-400" /> Time Travel Log
                         </h2>
                         <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white">
                             <XIcon className="w-6 h-6" />
                         </button>
                     </div>
                     
                     <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                         {generationHistory.length === 0 ? (
                             <div className="col-span-full text-center py-12 text-slate-500">
                                 <p className="text-lg mb-2">No time jumps recorded yet.</p>
                                 <p className="text-sm">Start your journey to create history!</p>
                             </div>
                         ) : (
                             generationHistory.map((item) => (
                                 <button
                                     key={item.id}
                                     onClick={() => {
                                         handleLoadHistory(item);
                                         setAppState(AppState.RESULT);
                                         setShowHistoryModal(false);
                                     }}
                                     className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-900/20 transition-all"
                                 >
                                     <img src={item.imageUrl} alt={item.era.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100 transition-opacity flex flex-col justify-end p-3">
                                         <p className="text-cyan-300 font-bold text-sm truncate">{item.era.name}</p>
                                         <p className="text-slate-400 text-xs">{new Date(item.timestamp).toLocaleDateString()}</p>
                                     </div>
                                 </button>
                             ))
                         )}
                     </div>
                     <div className="p-4 border-t border-white/10 bg-slate-900/50 text-center text-xs text-slate-500">
                         Displaying recent generations
                     </div>
                </div>
            </div>
        )}
      </div>
      </CommonUI>
    );
  }

  if (appState === AppState.FEATURE_DETAILS && selectedFeatureId) {
      const feature = FEATURE_CARDS.find(f => f.id === selectedFeatureId);
      if (!feature) {
          setAppState(AppState.DASHBOARD);
          return null;
      }

      return (
        <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
          <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center relative overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
               {/* Background Elements */}
               <div className={`absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br ${feature.color} opacity-10 rounded-full blur-[120px]`} />

               <div className="w-full max-w-4xl relative z-10">
                   <button 
                      onClick={() => {
                          setSelectedFeatureId(null);
                          setAppState(AppState.DASHBOARD);
                      }}
                      className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition group"
                   >
                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                           <ArrowLeftIcon className="w-4 h-4" />
                       </div>
                       <span className="font-medium">Back to Dashboard</span>
                   </button>

                   <div className="grid md:grid-cols-2 gap-12 items-center">
                       <div>
                           <div className={`w-20 h-20 bg-gradient-to-br ${feature.color.replace('from-', 'from-').replace('to-', 'to-').replace('400', '900/50').replace('500', '900/50')} rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/10`}>
                                {feature.icon === 'bolt' && <span className="text-4xl text-cyan-400">⚡</span>}
                                {feature.icon === 'sparkles' && <SparklesIcon className="w-10 h-10 text-purple-400" />}
                                {feature.icon === 'movie' && <MovieIcon className="w-10 h-10 text-pink-400" />}
                           </div>
                           
                           <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">{feature.title}</h1>
                           <p className="text-lg text-slate-300 leading-relaxed mb-8">{feature.longDescription}</p>
                           
                           <div className="space-y-4 mb-10">
                               {feature.features.map((item, i) => (
                                   <div key={i} className="flex items-center gap-3">
                                       <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${feature.color}`} />
                                       <span className="text-slate-200 font-medium">{item}</span>
                                   </div>
                               ))}
                           </div>

                           <button
                               onClick={() => setAppState(AppState.CAMERA)}
                               className={`px-8 py-4 bg-gradient-to-r ${feature.color} text-slate-950 font-bold text-lg rounded-xl hover:scale-105 transition-all shadow-lg flex items-center gap-3`}
                           >
                               <CameraIcon className="w-5 h-5" />
                               {feature.buttonText}
                           </button>
                       </div>

                       {/* Visual Side */}
                       <div className="hidden md:flex items-center justify-center">
                           <div className="relative w-full aspect-square max-w-sm">
                               <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-20 blur-3xl rounded-full`} />
                               <div className="relative h-full bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-2xl">
                                   <div className="text-8xl mb-4 opacity-80">
                                       {feature.id === 'time_travel' && '🏛️'}
                                       {feature.id === 'analysis' && '🔍'}
                                       {feature.id === 'video' && '🎬'}
                                   </div>
                                   <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
                                       {feature.id === 'time_travel' && 'Generative AI'}
                                       {feature.id === 'analysis' && 'Multimodal Vision'}
                                       {feature.id === 'video' && 'Generative Video'}
                                   </p>
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
          </div>
        </CommonUI>
      );
  }

  if (appState === AppState.CAMERA) {
    return (
        <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
        <div className="h-screen w-full bg-black overflow-hidden relative">
            <div className="absolute top-6 left-6 z-20">
                <button 
                    onClick={goHome} 
                    className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/10 transition-all shadow-lg group"
                >
                    <HomeIcon className="w-5 h-5 group-hover:scale-105 transition-transform" />
                    <span className="font-medium text-sm">Dashboard</span>
                </button>
            </div>
            <h1 className="absolute top-4 left-0 right-0 text-center z-10 font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-wider uppercase drop-shadow-md pointer-events-none">
                ChronoBooth
            </h1>
            <Camera ref={cameraRef} onCapture={handleCapture} />
        </div>
        </CommonUI>
    );
  }

  if (appState === AppState.PREVIEW) {
    return (
      <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        {/* Top Bar */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 backdrop-blur z-10 sticky top-0">
          <button onClick={reset} className="text-white flex items-center gap-2 hover:text-cyan-400 transition">
            <span className="text-2xl">←</span> Retake
          </button>
          <h2 className="font-bold text-white">Preview</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* Image Preview Side */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-black/40 relative">
                 <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-w-md w-full aspect-[3/4] md:aspect-auto bg-black">
                    {capturedImage && (
                        <img 
                            src={capturedImage} 
                            alt="Captured" 
                            className="w-full h-full object-cover transition-all duration-300"
                            style={{ filter: activeFilter.style }}
                        />
                    )}
                    
                    {/* Analysis Overlay */}
                    {analysis && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur p-4 animate-in slide-in-from-bottom duration-300">
                             <div className="flex flex-wrap gap-2 mb-2">
                                {analysis.tags.map((tag, i) => (
                                    <span key={i} className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full border border-cyan-700/50">{tag}</span>
                                ))}
                             </div>
                             <p className="text-sm text-slate-300">{analysis.description}</p>
                        </div>
                    )}
                 </div>

                 {/* Filters Selector */}
                 <div className="w-full max-w-md mt-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    <p className="text-xs text-slate-400 mb-2 font-mono uppercase tracking-widest">Apply Style</p>
                    <div className="flex gap-2">
                        {FILTERS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setActiveFilter(f)}
                                className={`
                                    px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                                    ${activeFilter.id === f.id 
                                        ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                                        : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700 hover:text-white'}
                                `}
                            >
                                {f.name}
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Analyze Button */}
                 {!analysis && (
                     <button 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="mt-6 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-900 px-4 py-2 rounded-full transition-all text-sm font-medium disabled:opacity-50"
                     >
                        {isAnalyzing ? (
                            <span className="animate-pulse">Analyzing...</span>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" /> Analyze Scene
                            </>
                        )}
                     </button>
                 )}
            </div>

            {/* Era Selection Side */}
            <div className="flex-1 border-l border-white/10 h-full overflow-y-auto">
                 <EraSelector onSelect={handleSelectEra} />
            </div>
        </div>
      </div>
      </CommonUI>
    );
  }

  if (appState === AppState.PROCESSING) {
    return (
      <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        
        {/* Animated Rings */}
        <div className="relative w-64 h-64 mb-8">
            <div className="absolute inset-0 border-4 border-t-cyan-500 border-r-purple-500 border-b-pink-500 border-l-yellow-500 rounded-full animate-[spin_1s_linear_infinite]" />
            <div className="absolute inset-4 border-4 border-t-purple-500 border-r-pink-500 border-b-yellow-500 border-l-cyan-500 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
            <div className="absolute inset-8 border-4 border-t-pink-500 border-r-yellow-500 border-b-cyan-500 border-l-purple-500 rounded-full animate-[spin_3s_linear_infinite]" />
            
            <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-4xl animate-pulse">⏳</span>
            </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-2 relative z-10">{processingMessage}</h2>
        <p className="text-slate-400 max-w-md animate-pulse relative z-10">
            AI is painting pixels...<br/>
            Please keep hands and feet inside the booth.
        </p>
      </div>
      </CommonUI>
    );
  }

  if (appState === AppState.RESULT && generatedImage) {
    return (
      <CommonUI isListening={isListening} onToggleListening={() => setIsListening(!isListening)} lastCommand={lastCommand}>
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
        {/* Header */}
        <div className="w-full max-w-2xl flex justify-between items-center mb-6 mt-2">
             <button onClick={reset} className="text-slate-400 hover:text-white flex items-center gap-2 transition">
                 <RefreshIcon className="w-5 h-5" /> <span className="hidden sm:inline">Start Over</span>
             </button>
             <h1 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 truncate max-w-[150px] sm:max-w-xs text-center">
                {selectedEra?.name}
             </h1>
             
             <div className="flex gap-3">
                 <button onClick={handleShare} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition">
                     <ShareIcon className="w-5 h-5" /> <span className="hidden sm:inline">Share</span>
                 </button>
                 {generatedVideo ? (
                    <a href={generatedVideo} download={`chronobooth-${selectedEra?.id}.mp4`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition">
                        <DownloadIcon className="w-5 h-5" /> <span className="hidden sm:inline">Save</span>
                    </a>
                 ) : (
                    <a href={generatedImage} download={`chronobooth-${selectedEra?.id}.jpg`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition">
                        <DownloadIcon className="w-5 h-5" /> <span className="hidden sm:inline">Save</span>
                    </a>
                 )}
             </div>
        </div>

        {/* Main Result Card */}
        <div className={`relative group w-full ${videoAspectRatio === '16:9' ? 'aspect-video max-w-3xl' : 'aspect-[9/16] max-w-md'} rounded-2xl overflow-hidden shadow-2xl shadow-cyan-900/20 border border-white/10 bg-black transition-all duration-500`}>
            {isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur z-20 flex flex-col items-center justify-center text-white">
                     <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                     <p>Processing...</p>
                </div>
            )}
            
            {generatedVideo ? (
                <>
                    <video 
                        ref={videoPlayerRef}
                        src={generatedVideo} 
                        autoPlay 
                        loop 
                        controls
                        playsInline 
                        className="w-full h-full object-cover"
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                        onEnded={handleVideoEnded}
                        onSeeked={handleVideoSeek}
                    />
                    {selectedMusic && (
                        <audio 
                            ref={audioRef}
                            src={selectedMusic.url}
                            loop
                            className="hidden"
                        />
                    )}
                </>
            ) : (
                <img src={generatedImage} alt="Time Travel Result" className="w-full h-full object-cover" />
            )}
            
            {/* Gradient Overlay for bottom text visibility */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
            
            {/* Toggle View Button (if video exists) */}
            {generatedVideo && (
                <button 
                    onClick={() => setGeneratedVideo(null)}
                    className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white px-3 py-1 rounded-full text-xs hover:bg-black/70 transition border border-white/10 z-10"
                >
                    Show Image
                </button>
            )}
        </div>

        {/* Caption Section (AI Analysis) */}
        {!generatedVideo && (
             <div className="w-full max-w-md mt-6">
                 {!generatedCaption ? (
                     <button 
                        onClick={handleGenerateCaption}
                        disabled={isGeneratingCaption}
                        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-cyan-400 font-medium transition disabled:opacity-50"
                     >
                         {isGeneratingCaption ? (
                             <>
                                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                Writing caption...
                             </>
                         ) : (
                             <>
                                <SparklesIcon className="w-4 h-4" /> Generate AI Caption
                             </>
                         )}
                     </button>
                 ) : (
                     <div className={`relative p-4 rounded-xl bg-slate-800/60 border border-cyan-500/20 shadow-lg animate-in fade-in slide-in-from-bottom-2 transition-all duration-300 ${isGeneratingCaption ? 'bg-slate-800/80 border-cyan-400/30' : ''}`}>
                         <p className={`text-slate-300 text-sm italic leading-relaxed pr-8 transition-all duration-300 ${isGeneratingCaption ? 'opacity-70 animate-pulse' : ''}`}>
                            {isGeneratingCaption ? "Consulting the archives..." : `"${generatedCaption}"`}
                         </p>
                         <button 
                             onClick={handleGenerateCaption}
                             disabled={isGeneratingCaption}
                             className={`absolute top-2 right-2 p-1.5 transition rounded-full hover:bg-white/5 ${isGeneratingCaption ? 'text-cyan-400 cursor-wait' : 'text-slate-500 hover:text-cyan-400'}`}
                             title="Regenerate Caption"
                         >
                             <RefreshIcon className={`w-4 h-4 ${isGeneratingCaption ? 'animate-spin' : ''}`} />
                         </button>
                     </div>
                 )}
             </div>
        )}

        {/* Music Selection (Video Only) */}
        {generatedVideo && (
            <div className="w-full max-w-md mt-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                 <p className="text-xs text-slate-400 mb-2 font-mono uppercase tracking-widest flex items-center gap-2">
                    <MusicNoteIcon className="w-3 h-3" /> Soundtrack (Preview)
                 </p>
                 <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedMusic(null)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${!selectedMusic ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Silent
                    </button>
                    {MUSIC_TRACKS.map(track => (
                        <button
                            key={track.id}
                            onClick={() => setSelectedMusic(track)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex flex-col items-start gap-0.5
                                ${selectedMusic?.id === track.id 
                                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                                    : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-slate-700'}
                            `}
                        >
                            <span>{track.name}</span>
                            <span className="text-[10px] opacity-70 font-normal">{track.style}</span>
                        </button>
                    ))}
                 </div>
            </div>
        )}

        {/* Actions Bar */}
        <div className="w-full max-w-md mt-6 grid grid-cols-1 gap-4">
             {/* Edit Button */}
             <button 
                onClick={() => {
                    setShowEditInput(!showEditInput);
                }}
                className={`p-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all border w-full
                    ${showEditInput ? 'bg-cyan-900/50 text-cyan-300 border-cyan-500' : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/5'}
                `}
             >
                <WandIcon className="w-5 h-5" />
                {showEditInput ? 'Close Editor' : 'Magic Edit'}
             </button>
        </div>

        {/* Edit Panel (Slide down) */}
        {showEditInput && !generatedVideo && (
            <div className="w-full max-w-md mt-4 bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-white/10 animate-in slide-in-from-top-2 fade-in relative">
                
                {/* Panel Header with Undo/Redo */}
                <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Editor</span>
                     <div className="flex gap-2">
                         <button 
                            onClick={handleUndo} 
                            disabled={isGenerating || editHistory.length === 0}
                            className={`text-xs flex items-center gap-1 transition ${editHistory.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                         >
                             <UndoIcon className="w-3 h-3" /> Undo
                         </button>
                         <button 
                            onClick={handleRedo} 
                            disabled={isGenerating || redoHistory.length === 0}
                             className={`text-xs flex items-center gap-1 transition ${redoHistory.length === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                         >
                             <RedoIcon className="w-3 h-3" /> Redo
                         </button>
                     </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Input Area */}
                    <div className="relative">
                        <textarea 
                            value={editPrompt}
                            onChange={(e) => setEditPrompt(e.target.value)}
                            placeholder="Describe your edit in detail...&#10;(e.g. 'Add a neon sign', 'Change background to Mars', 'Make it look like a sketch')"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-500 resize-none min-h-[80px] text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleEdit();
                                }
                            }}
                            autoFocus
                        />
                         {/* Clear Button */}
                         {editPrompt && (
                            <button
                                onClick={() => setEditPrompt('')}
                                className="absolute right-12 top-3 text-slate-500 hover:text-white transition"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                        {/* Send Button */}
                        <button 
                            onClick={() => handleEdit()}
                            disabled={!editPrompt.trim() || isGenerating}
                            className="absolute right-3 bottom-3 bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                        >
                            <WandIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quick Actions / Suggestions */}
                    <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Creative Helpers</p>
                        <div className="flex flex-wrap gap-2">
                            {/* Functional */}
                            <button 
                                onClick={() => setEditPrompt(prev => prev + (prev ? " " : "") + "Add ")} 
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition flex items-center gap-1.5"
                            >
                                <PlusIcon className="w-3 h-3 text-green-400" /> Add
                            </button>
                            <button 
                                onClick={() => setEditPrompt(prev => prev + (prev ? " " : "") + "Remove ")}
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition flex items-center gap-1.5"
                            >
                                <TrashIcon className="w-3 h-3 text-red-400" /> Remove
                            </button>
                            
                            {/* Stylistic */}
                            <button 
                                onClick={() => handleEdit("Enhance image quality, lighting, and details.")}
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition flex items-center gap-1.5"
                            >
                                <ZapIcon className="w-3 h-3 text-yellow-400" /> Auto-Enhance
                            </button>

                             <button 
                                onClick={() => setEditPrompt("Turn this into a sketching style drawing.")}
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition"
                            >
                                Sketch
                            </button>
                            <button 
                                onClick={() => setEditPrompt("Make the lighting cinematic and dramatic.")}
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition"
                            >
                                Cinematic
                            </button>
                             <button 
                                onClick={() => setEditPrompt("Change the background to a futuristic city.")}
                                className="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-500/30 rounded-lg text-xs text-slate-300 transition"
                            >
                                Future City
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* History Gallery */}
        {generationHistory.length > 0 && (
             <div className="w-full max-w-md mt-8">
                  <h3 className="text-slate-500 text-[10px] font-bold mb-3 uppercase tracking-wider ml-1">Recent Journeys</h3>
                  <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent px-1">
                      {generationHistory.map(item => (
                           <button 
                              key={item.id} 
                              onClick={() => handleLoadHistory(item)} 
                              className={`shrink-0 relative w-16 h-20 rounded-lg overflow-hidden border transition-all group
                                ${generatedImage === item.imageUrl ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-white/10 hover:border-white/40'}
                              `}
                           >
                              <img src={item.imageUrl} className="w-full h-full object-cover" alt="History thumbnail" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1">
                                <span className="text-[8px] text-cyan-300 font-bold truncate">{item.era.name}</span>
                              </div>
                              {/* Timestamp Badge */}
                              <div className="absolute top-1 right-1 bg-black/60 backdrop-blur rounded px-1 text-[8px] text-white/70">
                                {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}).replace(/^0/, '')}
                              </div>
                           </button>
                      ))}
                  </div>
             </div>
        )}

        {/* Prompt Display */}
        <div className="w-full max-w-md mt-2 flex flex-col items-center pb-8">
             <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-xs text-slate-500 hover:text-cyan-400 transition flex items-center gap-1 mb-2"
             >
                {showPrompt ? 'Hide Generation Prompt' : 'View Generation Prompt'}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showPrompt ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
             </button>
             
             {showPrompt && (
                 <div className="w-full p-4 rounded-xl bg-black/40 border border-white/5 text-left animate-in fade-in slide-in-from-top-2 relative group">
                     <label className="text-cyan-500 font-bold text-xs block mb-2">PROMPT (Editable):</label>
                     <textarea
                        value={customEraPrompt}
                        onChange={(e) => setCustomEraPrompt(e.target.value)}
                        className="w-full bg-slate-900/50 text-slate-300 text-xs font-mono p-3 rounded-lg border border-white/10 focus:border-cyan-500 focus:outline-none resize-y min-h-[80px]"
                     />
                     <div className="flex justify-end mt-2">
                        <button
                            onClick={handleRegenerate}
                            disabled={isGenerating}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshIcon className="w-3 h-3" /> Regenerate
                        </button>
                     </div>
                 </div>
             )}
         </div>

        <div className="mt-4 text-center text-slate-500 text-sm pb-8">
            Powered by Gemini 2.5 Flash Image & Gemini 3 Pro
        </div>
      </div>
      </CommonUI>
    );
  }

  return null;
}
