// Shared video settings. Plain x264 settings crush soft gradients into visible bands; these keep skies and glows smooth.
export const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'animation', '-x264-params', 'aq-mode=3:aq-strength=1.15', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
