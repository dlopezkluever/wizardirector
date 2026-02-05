import { useRef, useState, useCallback, useEffect } from 'react';
import { Eraser, Paintbrush, RotateCcw, Undo2, Redo2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type Tool = 'brush' | 'eraser';

interface InpaintCanvasProps {
  sourceImageUrl: string;
  onMaskChange?: (maskDataUrl: string | null) => void;
  width?: number;
  height?: number;
}

interface HistoryEntry {
  imageData: ImageData;
}

export function InpaintCanvas({
  sourceImageUrl,
  onMaskChange,
  width = 640,
  height = 360,
}: InpaintCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMaskOverlay, setShowMaskOverlay] = useState(true);
  const [hasMask, setHasMask] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Load source image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImageRef.current = img;
    };
    img.src = sourceImageUrl;
  }, [sourceImageUrl, width, height]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Remove any redo states
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ imageData });

    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const newIndex = historyIndex - 1;
    if (newIndex >= 0) {
      ctx.putImageData(history[newIndex].imageData, 0, 0);
      setHistoryIndex(newIndex);
      updateMaskState();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHistoryIndex(-1);
      setHasMask(false);
      onMaskChange?.(null);
    }
  }, [history, historyIndex, onMaskChange, updateMaskState]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const ctx = contextRef.current;
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
    updateMaskState();
  }, [history, historyIndex, updateMaskState]);

  // Clear all
  const clearAll = useCallback(() => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    onMaskChange?.(null);
    saveToHistory();
  }, [onMaskChange, saveToHistory]);

  // Check if mask has any content
  const updateMaskState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let hasContent = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        hasContent = true;
        break;
      }
    }

    setHasMask(hasContent);

    if (hasContent) {
      onMaskChange?.(canvas.toDataURL('image/png'));
    } else {
      onMaskChange?.(null);
    }
  }, [onMaskChange]);

  // Get mouse/touch position
  const getPosition = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const ctx = contextRef.current;
      if (!ctx) return;

      const { x, y } = getPosition(e);

      ctx.beginPath();
      ctx.moveTo(x, y);

      if (tool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      } else {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      }

      ctx.lineWidth = brushSize;
      setIsDrawing(true);
    },
    [tool, brushSize, getPosition]
  );

  // Draw
  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;

      const ctx = contextRef.current;
      if (!ctx) return;

      const { x, y } = getPosition(e);

      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getPosition]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      updateMaskState();
      saveToHistory();
    }
  }, [isDrawing, updateMaskState, saveToHistory]);

  // Export mask
  const exportMask = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasMask) return null;

    return canvas.toDataURL('image/png');
  }, [hasMask]);

  // Expose export function via ref
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Attach export function to canvas element
    const canvasWithExport = canvas as HTMLCanvasElement & { exportMask?: () => string | null };
    canvasWithExport.exportMask = exportMask;

    return () => {
      delete canvasWithExport.exportMask;
    };
  }, [exportMask]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tool selection */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={tool === 'brush' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('brush')}
              className="h-8 px-3"
            >
              <Paintbrush className="w-4 h-4 mr-1" />
              Brush
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool('eraser')}
              className="h-8 px-3"
            >
              <Eraser className="w-4 h-4 mr-1" />
              Eraser
            </Button>
          </div>

          {/* Brush size */}
          <div className="flex items-center gap-2 px-3">
            <span className="text-xs text-muted-foreground w-8">{brushSize}px</span>
            <Slider
              value={[brushSize]}
              onValueChange={([value]) => setBrushSize(value)}
              min={10}
              max={100}
              step={5}
              className="w-24"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={historyIndex < 0}
            className="h-8 w-8"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 w-8"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          {/* Toggle overlay */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMaskOverlay(!showMaskOverlay)}
            className="h-8 w-8"
          >
            {showMaskOverlay ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearAll}
            disabled={!hasMask}
            className="h-8 w-8"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative rounded-lg overflow-hidden border border-border/30">
        {/* Source image */}
        <img
          src={sourceImageUrl}
          alt="Source"
          className="w-full h-auto"
          draggable={false}
        />

        {/* Mask canvas overlay */}
        <canvas
          ref={canvasRef}
          className={cn(
            'absolute inset-0 w-full h-full cursor-crosshair',
            !showMaskOverlay && 'opacity-0'
          )}
          style={{
            mixBlendMode: 'normal',
            background: 'transparent',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Brush cursor preview */}
        {isDrawing && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white mix-blend-difference"
            style={{
              width: brushSize,
              height: brushSize,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        Paint over areas you want to modify. White regions will be edited.
      </p>
    </div>
  );
}
