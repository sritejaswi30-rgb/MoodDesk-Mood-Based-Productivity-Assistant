import { MoodState, MoodAnalysis } from './types';

// Large, curated dictionary of mood keywords and their stem equivalents
const LEXICON: Record<MoodState, string[]> = {
  Happy: [
    'happy', 'joy', 'joyful', 'cheerful', 'wonderful', 'glad', 'delighted', 'awesome', 
    'amazing', 'perfect', 'good', 'great', 'content', 'love', 'smile', 'laugh', 'excited', 
    'grateful', 'blessed', 'fabulous', 'thrilled', 'fantastic', 'pleased', 'hopeful', 
    'optimistic', 'bliss', 'sunny', 'nice', 'pleasant', 'enjoy', 'enjoyable', 'happy-go-lucky'
  ],
  Sad: [
    'sad', 'unhappy', 'depressed', 'sorrow', 'grief', 'cry', 'gloomy', 'heartbroken', 
    'down', 'lonely', 'hurt', 'pain', 'blue', 'tears', 'alone', 'hopeless', 'miserable', 
    'empty', 'grieved', 'sorrowful', 'melancholy', 'disappointed', 'regret', 'weep', 
    'longing', 'heartbreak', 'gloomy', 'heavyhearted', 'downcast', 'deserted', 'lost'
  ],
  Stressed: [
    'stressed', 'anxious', 'overwhelmed', 'worry', 'worried', 'tense', 'nervous', 'tired', 
    'exhausted', 'burnout', 'pressure', 'deadline', 'busy', 'panic', 'scared', 'fear', 
    'frustrated', 'struggle', 'struggling', 'breakdown', 'frustration', 'shaky', 'dread', 
    'overworked', 'irritated', 'annoyed', 'headache', 'jittery', 'restless', 'uneasy', 'heavy'
  ],
  Motivated: [
    'motivated', 'inspired', 'driven', 'focus', 'focused', 'achieve', 'success', 'determine', 
    'determined', 'ambitious', 'goals', 'ready', 'passionate', 'energy', 'energetic', 'productive', 
    'work', 'grow', 'learn', 'win', 'progress', 'forward', 'conquer', 'discipline', 'eager', 
    'dedication', 'creative', 'focusing', 'sharp', 'accomplish', 'resolved', 'willpower'
  ],
  Neutral: [
    'neutral', 'fine', 'ok', 'okay', 'average', 'indifferent', 'routine', 'regular', 
    'customary', 'normal', 'status', 'casual', 'plain', 'maybe', 'indifferent', 'usual', 
    'calm', 'quiet', 'still', 'blank', 'flat', 'middle', 'moderate', 'standard'
  ]
};

// Intensifiers (boost scores)
const BOOSTERS = ['very', 'extremely', 'super', 'highly', 'so', 'really', 'absolutely', 'deeply', 'incredibly', 'most'];

// Negations (invert or neutralize scores)
const NEGATIONS = ['not', 'no', 'never', 'dont', "don't", 'cant', "can't", 'wont', "won't", 'wasnt', "wasn't", 'neither', 'nor', 'hate', 'without'];

/**
 * Normalizes input text for processing (lowercasing, removing core special characters)
 */
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Main local sentiment classification engine
 * Employs a sliding context window to check for boosters and negations around keyword matches
 */
export function analyzeMoodLocally(rawText: string): MoodAnalysis {
  const text = cleanText(rawText);
  const scores: Record<MoodState, number> = {
    Happy: 0,
    Sad: 0,
    Stressed: 0,
    Motivated: 0,
    Neutral: 0
  };

  if (!text) {
    return {
      mood: 'Neutral',
      confidence: 100,
      scores,
      wordMatches: [],
      explanation: "No text was provided. Defaulted to Neutral state."
    };
  }

  const words = text.split(' ');
  const wordMatches: { word: string; mood: MoodState; multiplier: number }[] = [];

  for (let idx = 0; idx < words.length; idx++) {
    const word = words[idx];
    
    // Search the lexicons
    for (const [moodCategory, keywordList] of Object.entries(LEXICON)) {
      const mood = moodCategory as MoodState;
      
      // Exact or prefix match (stemming approximation)
      const matchedKeyword = keywordList.find(kw => 
        word === kw || (kw.length > 4 && word.startsWith(kw.slice(0, -1)))
      );

      if (matchedKeyword) {
        let multiplier = 1.0;

        // Check window (up to 2 words prior) for boosters and negations
        const prevWords = words.slice(Math.max(0, idx - 2), idx);
        
        const hasBooster = prevWords.some(pw => BOOSTERS.includes(pw));
        const hasNegation = prevWords.some(pw => NEGATIONS.includes(pw));

        if (hasBooster) multiplier *= 1.5;
        
        if (hasNegation) {
          // If negated, divert the categorization typical rules:
          // e.g. "not happy" -> increases Sad / Neutral, decreases Happy
          multiplier *= -0.8; // negate the original mood category's contribution
        }

        // Add to absolute score category, guarding against negative baseline
        const finalContribution = 1.0 * multiplier;
        if (finalContribution > 0) {
          scores[mood] += finalContribution;
        } else if (finalContribution < 0) {
          // Send negated positivity to sad/neutral, or negated stress to normal/happy
          if (mood === 'Happy') scores['Sad'] += Math.abs(finalContribution);
          if (mood === 'Stressed') scores['Neutral'] += Math.abs(finalContribution) * 0.5;
          if (mood === 'Motivated') scores['Neutral'] += Math.abs(finalContribution);
        }

        wordMatches.push({ word, mood, multiplier });
        break; // Match found, advance to next word
      }
    }
  }

  // Adjust scores to ensure some baseline values or defaults
  const totalScores = Object.values(scores).reduce((a, b) => a + b, 0);

  // Default fallback if no keywords found:
  // We check if sentences are long or short. Neutral is default.
  if (totalScores === 0) {
    scores['Neutral'] = 1.0;
    return {
      mood: 'Neutral',
      confidence: 70,
      scores,
      wordMatches: [],
      explanation: "We couldn't detect any highly specific mood cues, so we've customized a calm, balanced, Neutral workspace for you."
    };
  }

  // Find the highest score
  let detectedMood: MoodState = 'Neutral';
  let maxScore = -1;

  for (const [mood, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedMood = mood as MoodState;
    }
  }

  // Calculate confidence accurately
  // Confidence is proportional to the dominance of the selected mood over others
  const percentage = maxScore / totalScores;
  let confidence = Math.round(percentage * 100);

  // Map ranges for confidence
  if (confidence < 30) confidence = 45; // baseline calibration
  if (confidence > 95) confidence = 95; // cap to allow human nuance variance

  // Generate dynamic explanations
  let explanation = '';
  switch (detectedMood) {
    case 'Happy':
      explanation = `Detected high optimism and joyful cues. We've unlocked the warm sunrise mood theme to cultivate gratitude!`;
      break;
    case 'Sad':
      explanation = `Sensed reflective, quiet, or somber tones. Your deck is configured with a calm, comforting, dark slate ambiance. No rush—take it easy.`;
      break;
    case 'Stressed':
      explanation = `Identified high pressure, exhaustion, or anxiety keywords. We've enabled your "Recovery Mode" to help you breathe and pace yourself.`;
      break;
    case 'Motivated':
      explanation = `Energetic, goal-oriented driving vocabulary detected. Deep Focus mode is primed and your high-impact task suggestion card is loaded! Let's conquer this.`;
      break;
    case 'Neutral':
      explanation = `Calm, steady, or balanced language noted. Welcome to a minimal, distraction-free neutral space to carry out your routine.`;
      break;
  }

  return {
    mood: detectedMood,
    confidence,
    scores,
    wordMatches,
    explanation
  };
}

/**
 * Initial standard mood curated list tasks
 */
export const DEFAULT_CURATED_TASKS: Record<MoodState, string[]> = {
  Happy: [
    'Share a positive thought or compliment with a colleague/friend',
    'Write down 3 things you are incredibly grateful for right now',
    'Review your achievements over the past week and celebrate them',
    'Do a 10-minute brainstorming session for a creative side project',
    'Clean or reorganize one section of your workspace for a fresh vibe'
  ],
  Sad: [
    'Take a warm 5-minute break and stretch your shoulders',
    'Drink a glass of water slowly; hydrate your mind',
    'Do a low-friction administrative task (e.g., clear spam emails)',
    'Listen to a comforting, calming ambient audio track',
    'Scribble any confusing feelings onto a scratchpad, then delete them'
  ],
  Stressed: [
    'Perform a 3-minute diaphragmatic breathing session (follow our bubble)',
    'Divide your single largest project task into 4 tiny micro-steps',
    'Close your browser tabs except for the one absolute priority',
    'Step away from screens completely—look outside the window for 2 minutes',
    'Brainstorm a "stop-doing" list containing non-urgent tasks'
  ],
  Motivated: [
    'Launch a 25-minute Pomodoro timer for your hardest deep-work task',
    'Map out your most critical goals and assign the absolute first step',
    'Silence all notifications and commit to 45 minutes of unbroken work',
    'Draft a core business or personal outline you been postponing',
    'Review your long-term vision board and align today\'s schedule'
  ],
  Neutral: [
    'Organize your physical or digital desk layout',
    'Review your personal task inbox and categorize items by urgency',
    'Go through a standard learning module or read 3 pages of a book',
    'Update your weekly calendar slots and check for overlaps',
    'Plan a low-key exercise or movement route for later today'
  ]
};
