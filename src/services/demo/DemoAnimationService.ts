// Demo Animation Service - Handles all demo animations and timings
export const TRANSCRIPT_ANIMATION_INTERVAL = 400; 
export const CLINICAL_PLAN_SIMULATION_DELAY = 200; 

export class DemoAnimationService {
  private static transcriptIntervalId: NodeJS.Timeout | null = null;
  private static clinicalPlanTimeoutId: NodeJS.Timeout | null = null;

  static startTranscriptAnimation(
    transcriptLines: string[],
    onLineUpdate: (animatedTranscript: string) => void,
    onComplete: () => void
  ): void {
    if (transcriptLines.length === 0) {
      console.warn("No transcript lines to animate");
      onComplete();
      return;
    }

    console.log(`Starting transcript animation with ${transcriptLines.length} lines`);
    this.clearTranscriptAnimation();
    
    let currentIndex = 1;
    let animatedText = transcriptLines[0] || '';
    console.log(`Animation line 0/${transcriptLines.length}: "${animatedText.substring(0, 50)}..."`);
    onLineUpdate(animatedText);

    this.transcriptIntervalId = setInterval(() => {
      if (currentIndex < transcriptLines.length) {
        animatedText += '\n' + transcriptLines[currentIndex];
        console.log(`Animation line ${currentIndex}/${transcriptLines.length}: "${transcriptLines[currentIndex].substring(0, 50)}..."`);
        onLineUpdate(animatedText);
        currentIndex++;
      } else {
        console.log('Transcript animation completed');
        this.clearTranscriptAnimation();
        onComplete();
      }
    }, TRANSCRIPT_ANIMATION_INTERVAL);
  }

  static startClinicalPlanSimulation(onComplete: () => void): void {
    this.clearClinicalPlanSimulation();
    
    this.clinicalPlanTimeoutId = setTimeout(() => {
      this.clinicalPlanTimeoutId = null;
      onComplete();
    }, CLINICAL_PLAN_SIMULATION_DELAY);
  }

  static clearTranscriptAnimation(): void {
    if (this.transcriptIntervalId) {
      clearInterval(this.transcriptIntervalId);
      this.transcriptIntervalId = null;
    }
  }

  static clearClinicalPlanSimulation(): void {
    if (this.clinicalPlanTimeoutId) {
      clearTimeout(this.clinicalPlanTimeoutId);
      this.clinicalPlanTimeoutId = null;
    }
  }

  static clearAllAnimations(): void {
    this.clearTranscriptAnimation();
    this.clearClinicalPlanSimulation();
  }

  static isTranscriptAnimating(): boolean {
    return this.transcriptIntervalId !== null;
  }

  static isClinicalPlanSimulating(): boolean {
    return this.clinicalPlanTimeoutId !== null;
  }
} 