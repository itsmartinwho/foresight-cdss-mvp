/**
 * Side Panel Background Configuration
 * 
 * Easily change the background image and settings for side panels
 * across the dashboard and patients tab.
 */

export const SIDE_PANEL_CONFIG = {
  // Background image path (relative to public directory)
  backgroundImage: '/images/background_waves.png',
  
  // Opacity for the background image (0.3 = 70% transparency)
  opacity: 0.3,
  
  // Background positioning and sizing
  backgroundSize: 'cover', // 'cover', 'contain', 'auto', or specific size
  backgroundPosition: 'center', // 'center', 'top', 'bottom', etc.
  backgroundRepeat: 'no-repeat', // 'no-repeat', 'repeat', 'repeat-x', 'repeat-y'
};

/**
 * Alternative images to test:
 * 
 * - '/images/background_waves.png' (default)
 * - '/images/word-logo.png' (for testing)
 * - '/images/foresight-icon.png' (for testing)
 * 
 * To test a different image, simply change the backgroundImage value above.
 * You can also adjust opacity (0.1 = 90% transparent, 0.5 = 50% transparent, etc.)
 */ 