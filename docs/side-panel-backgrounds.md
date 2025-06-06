# Side Panel Background Images

The dashboard and patients tab side panels now support custom background images with configurable transparency.

## Configuration

All background image settings are centralized in `src/lib/side-panel-config.ts`:

```typescript
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
```

## Testing Different Images

To test a different background image:

1. Add your image to the `public/images/` directory
2. Edit `src/lib/side-panel-config.ts`
3. Update the `backgroundImage` path to your new image
4. Optionally adjust the `opacity` value:
   - `0.1` = 90% transparent (very subtle)
   - `0.3` = 70% transparent (default)
   - `0.5` = 50% transparent (more visible)
   - `0.7` = 30% transparent (quite visible)

### Available Images for Testing

Currently available in `public/images/`:
- `/images/background_waves.png` (default)
- `/images/word-logo.png`
- `/images/foresight-icon.png`
- `/images/word-logo-full.png`

### Example Configurations

**Subtle logo watermark:**
```typescript
{
  backgroundImage: '/images/foresight-icon.png',
  opacity: 0.1,
  backgroundSize: 'contain',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}
```

**Pattern background:**
```typescript
{
  backgroundImage: '/images/background_waves.png',
  opacity: 0.3,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}
```

## Implementation Details

The background images are implemented as absolutely positioned elements with:
- `z-index: -1` to ensure they appear behind all other content
- Proper border radius matching to maintain the panel's rounded corners
- CSS `overflow: hidden` on the parent container to prevent image overflow

## Affected Components

- **Dashboard View**: `src/components/views/DashboardView.tsx`
- **Patients List View**: `src/components/views/PatientsListView.tsx`

Both components import and use the shared configuration from `src/lib/side-panel-config.ts`. 