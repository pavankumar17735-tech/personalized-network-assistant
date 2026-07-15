import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface AudioVolumeVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export default function AudioVolumeVisualizer({ stream, isActive }: AudioVolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Initialize and clean up Web Audio nodes
  useEffect(() => {
    if (!isActive || !stream) {
      cleanupAudio();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();

      analyser.fftSize = 64; // Low FFT size for simple level indicators
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      // Start the render loop
      startRenderLoop();
    } catch (e) {
      console.error('Failed to initialize AudioContext for visualizer:', e);
    }

    return () => {
      cleanupAudio();
    };
  }, [stream, isActive]);

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.warn('Error closing AudioContext:', err));
      }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    // Clear canvas when idle
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startRenderLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mainCtx = canvas.getContext('2d');
    if (!mainCtx) return;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Create offscreen canvas for double-buffering to guarantee 60fps without flicker
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      if (!offscreenCtx) return;

      const width = offscreenCanvas.width;
      const height = offscreenCanvas.height;

      // Clear offscreen buffer
      offscreenCtx.clearRect(0, 0, width, height);

      // Draw bars
      const barCount = 10;
      const barWidth = 3;
      const gap = 2;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = (width - totalWidth) / 2;

      // Draw symmetric audio bars centered
      for (let i = 0; i < barCount; i++) {
        // Map frequency bins to bars
        const dataIdx = Math.floor((i / barCount) * bufferLength);
        const amplitude = dataArray[dataIdx] / 255; // 0.0 to 1.0

        // Calculate heights dynamically reacting to decibels
        const minHeight = 4;
        const maxHeight = height - 4;
        const barHeight = minHeight + amplitude * maxHeight;

        const x = startX + i * (barWidth + gap);
        const y = (height - barHeight) / 2;

        // Gradient for sleek styling
        const gradient = offscreenCtx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#c5a059'); // Gold accent
        gradient.addColorStop(1, '#e5c583'); // Light gold

        offscreenCtx.fillStyle = gradient;
        
        // Draw round-capped bars
        offscreenCtx.beginPath();
        if (offscreenCtx.roundRect) {
          offscreenCtx.roundRect(x, y, barWidth, barHeight, 2);
        } else {
          offscreenCtx.rect(x, y, barWidth, barHeight);
        }
        offscreenCtx.fill();
      }

      // Atomically transfer offscreen buffer to visible canvas (double-buffering)
      mainCtx.clearRect(0, 0, canvas.width, canvas.height);
      mainCtx.drawImage(offscreenCanvas, 0, 0);
    };

    draw();
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, width: 0 }}
      animate={{ scale: 1, opacity: 1, width: 'auto' }}
      exit={{ scale: 0.8, opacity: 0, width: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{ willChange: 'transform' }}
      className="inline-flex items-center justify-center pl-1.5 border-l border-amber-500/30 ml-1.5 self-center"
      id="speech-audio-visualizer-container"
    >
      <canvas
        ref={canvasRef}
        width={48}
        height={16}
        className="w-12 h-4 opacity-90"
        title="Real-time voice decibel visualizer"
      />
    </motion.div>
  );
}
