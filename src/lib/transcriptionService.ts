import { TranscriptSegment, Transcript, ClinicalNote } from './types';

/**
 * Service for voice transcription and note generation
 */
class TranscriptionService {
  private isRecording = false;
  private currentTranscript: Transcript | null = null;
  
  /**
   * Start recording and transcribing audio
   */
  async startRecording(patientId: string): Promise<Transcript> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }
    
    try {
      // In production, this would initialize the audio recording and transcription
      // For the MVP, we'll simulate the process
      
      const transcriptId = `transcript_${Date.now()}`;
      
      this.currentTranscript = {
        id: transcriptId,
        patientId,
        segments: [],
        startTime: new Date().toISOString(),
        status: 'in-progress'
      };
      
      this.isRecording = true;
      
      // Simulate initial transcription
      setTimeout(() => {
        this.addTranscriptSegment({
          speaker: 'doctor',
          text: 'Hello, how are you feeling today?',
          timestamp: new Date().toISOString()
        });
      }, 2000);
      
      return this.currentTranscript;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to start recording');
    }
  }
  
  /**
   * Stop recording and finalize transcript
   */
  async stopRecording(): Promise<Transcript> {
    if (!this.isRecording || !this.currentTranscript) {
      throw new Error('No recording in progress');
    }
    
    try {
      // In production, this would stop the audio recording and finalize the transcription
      // For the MVP, we'll simulate the process
      
      this.isRecording = false;
      this.currentTranscript.status = 'completed';
      this.currentTranscript.endTime = new Date().toISOString();
      
      const finalTranscript = { ...this.currentTranscript };
      this.currentTranscript = null;
      
      return finalTranscript;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw new Error('Failed to stop recording');
    }
  }
  
  /**
   * Add a segment to the current transcript
   * This would be called by the real-time transcription service in production
   */
  addTranscriptSegment(segment: TranscriptSegment): void {
    if (!this.isRecording || !this.currentTranscript) {
      throw new Error('No recording in progress');
    }
    
    this.currentTranscript.segments.push(segment);
  }
  
  /**
   * Get the current transcript
   */
  getCurrentTranscript(): Transcript | null {
    return this.currentTranscript;
  }
  
  /**
   * Generate a clinical note from a transcript
   */
  async generateClinicalNote(transcript: Transcript): Promise<ClinicalNote> {
    try {
      // In production, this would call the API endpoint
      // For the MVP, we'll simulate the response
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract text from transcript segments
      const doctorText = transcript.segments
        .filter(segment => segment.speaker === 'doctor')
        .map(segment => segment.text)
        .join(' ');
      
      const patientText = transcript.segments
        .filter(segment => segment.speaker === 'patient')
        .map(segment => segment.text)
        .join(' ');
      
      // Generate SOAP note sections
      // In production, this would use an LLM to generate the note
      
      // For the MVP, we'll simulate a simple note based on the transcript
      const subjective = this.generateSubjective(patientText);
      const objective = this.generateObjective(doctorText, patientText);
      const assessment = this.generateAssessment(doctorText, patientText);
      const plan = this.generatePlan(doctorText);
      
      return {
        id: `note_${Date.now()}`,
        patientId: transcript.patientId,
        transcriptId: transcript.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subjective,
        objective,
        assessment,
        plan
      };
    } catch (error) {
      console.error('Error generating clinical note:', error);
      throw new Error('Failed to generate clinical note');
    }
  }
  
  /**
   * Simulate a demo transcript for testing
   */
  generateDemoTranscript(patientId: string): Transcript {
    const transcriptId = `transcript_${Date.now()}`;
    const startTime = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
    const endTime = new Date().toISOString();
    
    return {
      id: transcriptId,
      patientId,
      segments: [
        {
          speaker: 'doctor',
          text: 'Hello, how are you feeling today?',
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Not great, doctor. I\'ve been having joint pain in my hands and wrists for about 3 months now. It\'s getting worse, especially in the mornings.',
          timestamp: new Date(Date.now() - 13.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'I\'m sorry to hear that. Can you describe the pain in more detail? Is it constant or does it come and go?',
          timestamp: new Date(Date.now() - 13 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'It\'s worst when I wake up. My hands feel stiff for at least an hour, sometimes two. Then it gets a bit better during the day, but never completely goes away. It\'s in both hands, especially the knuckles and wrists.',
          timestamp: new Date(Date.now() - 12.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'And have you noticed any swelling or redness in the joints?',
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Yes, the knuckles look swollen sometimes, and they\'re tender to touch. I\'ve also been feeling really tired lately, even when I get enough sleep.',
          timestamp: new Date(Date.now() - 11.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'Have you tried any medications for the pain?',
          timestamp: new Date(Date.now() - 11 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Just over-the-counter ibuprofen, but it only helps a little. I\'ve been taking it almost daily for the past month.',
          timestamp: new Date(Date.now() - 10.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'I see. And is there any history of arthritis or autoimmune conditions in your family?',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'My mother has thyroid problems - Hashimoto\'s, I think. And my aunt has lupus.',
          timestamp: new Date(Date.now() - 9.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'That\'s helpful information. Let me examine your hands and wrists.',
          timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'I can see some swelling in the joints of your fingers and wrists. There\'s tenderness when I press on them, and the range of motion is somewhat limited. Based on your symptoms, the physical examination, and your family history, I\'m concerned about possible rheumatoid arthritis.',
          timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Rheumatoid arthritis? Isn\'t that something older people get?',
          timestamp: new Date(Date.now() - 6.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'It can actually affect people of any age. It\'s an autoimmune condition where your immune system mistakenly attacks your joints. The symptoms you\'re describing - morning stiffness lasting more than an hour, symmetrical joint pain in both hands, fatigue - are classic signs. I\'d like to order some blood tests to help confirm the diagnosis.',
          timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'What kind of blood tests?',
          timestamp: new Date(Date.now() - 5.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'We\'ll check for markers of inflammation like ESR and CRP, and specific antibodies like rheumatoid factor and anti-CCP antibodies. I\'ll also order a complete blood count to check for anemia, which can occur with rheumatoid arthritis. And we should get some X-rays of your hands and wrists to look for any early joint changes.',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'If it is rheumatoid arthritis, what can be done about it?',
          timestamp: new Date(Date.now() - 4.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'The good news is that we have very effective treatments nowadays. Early diagnosis and treatment are key to preventing joint damage. If confirmed, I\'ll likely start you on a medication called methotrexate, which is the standard first-line treatment. I\'ll also refer you to a rheumatologist for specialized care. They might add other medications depending on how you respond.',
          timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Are there side effects to these medications?',
          timestamp: new Date(Date.now() - 3.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'All medications can have side effects, but we\'ll monitor you closely. Methotrexate can affect your liver and blood counts, so we\'ll do regular blood tests. We\'ll also give you folic acid to reduce side effects. In the meantime, you can continue taking ibuprofen for pain relief, but try not to exceed the recommended dose.',
          timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'OK, that makes sense. How soon will we know for sure if it\'s rheumatoid arthritis?',
          timestamp: new Date(Date.now() - 2.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'The blood tests should be back in a few days. I\'ll call you with the results, and we can schedule a follow-up appointment to discuss the next steps. Do you have any other questions for me today?',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        },
        {
          speaker: 'patient',
          text: 'Not right now. Thank you for explaining everything so clearly.',
          timestamp: new Date(Date.now() - 1.5 * 60 * 1000).toISOString()
        },
        {
          speaker: 'doctor',
          text: 'You\'re welcome. I\'ll send the lab orders electronically, and you can get the blood tests done today if possible. The X-ray department is on the first floor, and they take walk-ins. I\'ll see you at our follow-up appointment, but call if your symptoms worsen or if you have any concerns before then.',
          timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString()
        }
      ],
      startTime,
      endTime,
      status: 'completed'
    };
  }
  
  // Helper methods for generating SOAP note sections
  
  private generateSubjective(patientText: string): string {
    // In production, this would use an LLM to generate the subjective section
    // For the MVP, we'll return a simple template
    
    if (patientText.includes('joint pain') && patientText.includes('morning')) {
      return `Patient presents with a 3-month history of progressive joint pain affecting the hands and wrists bilaterally. Reports morning stiffness lasting 1-2 hours, with partial improvement throughout the day. Pain is described as constant but worse in the mornings. Patient also reports fatigue despite adequate sleep. Has been taking OTC ibuprofen with minimal relief. Family history significant for Hashimoto's thyroiditis in mother and lupus in maternal aunt.`;
    } else {
      return `Patient presents with multiple concerns as documented in the transcript. Patient's own words have been analyzed to extract the chief complaint, history of present illness, and relevant past medical, family, and social history.`;
    }
  }
  
  private generateObjective(doctorText: string, patientText: string): string {
    // In production, this would use an LLM to generate the objective section
    // For the MVP, we'll return a simple template
    
    if (doctorText.includes('swelling') && doctorText.includes('tenderness')) {
      return `Vital signs: Within normal limits\n\nMSK: Bilateral synovitis of MCP and PIP joints with tenderness to palpation. Wrist ROM limited by approximately 20% bilaterally. No deformities present.\n\nSkin: No rash or lesions\n\nLymph: No significant lymphadenopathy\n\nCardiopulmonary: Normal heart and lung sounds`;
    } else {
      return `Physical examination findings as documented in the transcript. Vital signs and objective measurements have been recorded. Relevant physical findings have been noted.`;
    }
  }
  
  private generateAssessment(doctorText: string, patientText: string): string {
    // In production, this would use an LLM to generate the assessment section
    // For the MVP, we'll return a simple template
    
    if (doctorText.includes('rheumatoid arthritis')) {
      return `1. Suspected rheumatoid arthritis based on:\n   - Symmetrical small joint polyarthritis\n   - Morning stiffness >1 hour\n   - Family history of autoimmune conditions\n   - Physical exam findings consistent with inflammatory arthritis\n\n2. Fatigue, likely related to inflammatory process\n\n3. Pending laboratory confirmation`;
    } else {
      return `Assessment of the patient's condition based on the subjective and objective findings. Differential diagnoses have been considered and the most likely diagnosis has been identified.`;
    }
  }
  
  private generatePlan(doctorText: string): string {
    // In production, this would use an LLM to generate the plan section
    // For the MVP, we'll return a simple template
    
    if (doctorText.includes('blood tests') && doctorText.includes('X-rays')) {
      return `1. Diagnostic workup:\n   - CBC, CMP, ESR, CRP\n   - RF, anti-CCP antibodies\n   - X-rays of bilateral hands and wrists\n\n2. Treatment:\n   - Continue ibuprofen as needed for pain\n   - Anticipate starting methotrexate pending lab confirmation\n\n3. Referrals:\n   - Rheumatology consultation\n\n4. Follow-up:\n   - Call patient with lab results\n   - Schedule follow-up appointment in 1 week\n   - Provide patient education materials on rheumatoid arthritis`;
    } else {
      return `Treatment plan based on the assessment. Includes medications, diagnostic tests, referrals, patient education, and follow-up plans.`;
    }
  }
}

// Export as singleton
export const transcriptionService = new TranscriptionService();
