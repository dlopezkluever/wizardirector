/**
 * Shot Validation Service
 * Purpose: Reusable validation logic for Stage 7 shot list locking
 * 
 * Features:
 * - Critical pre-validation (minimum shot count, ID uniqueness)
 * - Field validation (required fields, duration bounds)
 * - Shot coherence checking (character names, total duration)
 * - Detailed error/warning reporting
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  shotId: string;
  shotOrder: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export type ValidationWarning = ValidationError;

interface Shot {
  shotId: string;
  duration: number;
  action: string;
  setting: string;
  camera: string;
  dialogue?: string;
  charactersForeground?: string[];
  charactersBackground?: string[];
  continuityFlags?: string[];
}

export class ShotValidationService {
  validateShots(shots: Shot[], sceneData?: { expected_characters?: string[] }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // CRITICAL: Check for empty shot list
    if (shots.length === 0) {
      errors.push({
        shotId: 'scene',
        shotOrder: -1,
        field: 'shot_count',
        message: 'Scene must have at least one shot. Use Stage 7 to generate a shot list.',
        severity: 'error'
      });
      return { valid: false, errors, warnings };
    }

    // CRITICAL: Check for duplicate shot IDs
    const shotIdCounts = new Map<string, number>();
    shots.forEach(shot => {
      const count = shotIdCounts.get(shot.shotId) || 0;
      shotIdCounts.set(shot.shotId, count + 1);
    });

    shotIdCounts.forEach((count, shotId) => {
      if (count > 1) {
        errors.push({
          shotId,
          shotOrder: -1,
          field: 'shotId',
          message: `Duplicate shot ID "${shotId}" found ${count} times. Each shot must have a unique ID.`,
          severity: 'error'
        });
      }
    });

    // Field validation for each shot
    shots.forEach((shot, index) => {
      // Required fields
      if (!shot.action?.trim()) {
        errors.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'action',
          message: 'Action is required',
          severity: 'error'
        });
      }
      if (!shot.setting?.trim()) {
        errors.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'setting',
          message: 'Setting is required',
          severity: 'error'
        });
      }
      if (!shot.camera?.trim()) {
        errors.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'camera',
          message: 'Camera is required',
          severity: 'error'
        });
      }

      // Duration validation
      if (shot.duration < 1) {
        errors.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'duration',
          message: 'Minimum duration is 1 second (API limit)',
          severity: 'error'
        });
      } else if (shot.duration > 30) {
        errors.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'duration',
          message: 'Maximum duration is 30 seconds (quality threshold)',
          severity: 'error'
        });
      } else if (shot.duration < 4) {
        warnings.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'duration',
          message: `Duration ${shot.duration}s is very short. Quick cuts work for action but may feel rushed for dialogue.`,
          severity: 'warning'
        });
      } else if (shot.duration > 12) {
        warnings.push({
          shotId: shot.shotId,
          shotOrder: index,
          field: 'duration',
          message: `Duration ${shot.duration}s is unusually long. Long takes can be powerful but risk viewer attention.`,
          severity: 'warning'
        });
      }

      // Character name validation (if scene data provided)
      if (sceneData?.expected_characters) {
        const expectedCharacters = sceneData.expected_characters.map(c => c.toLowerCase().trim());
        
        (shot.charactersForeground || []).forEach(charName => {
          const normalized = charName.toLowerCase().trim();
          if (!expectedCharacters.includes(normalized)) {
            // Find closest match for typo suggestion
            const closestMatch = this.findClosestMatch(normalized, expectedCharacters);
            warnings.push({
              shotId: shot.shotId,
              shotOrder: index,
              field: 'charactersForeground',
              message: closestMatch
                ? `Character "${charName}" not found in scene dependencies. Did you mean "${closestMatch}"?`
                : `Character "${charName}" not found in scene dependencies. This may cause issues in Stage 8.`,
              severity: 'warning'
            });
          }
        });
      }
    });

    // Total duration check (dynamic bounds based on shot count)
    const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);
    const expectedMin = shots.length * 4;  // 4s/shot minimum
    const expectedMax = shots.length * 15; // 15s/shot maximum

    if (totalDuration < expectedMin) {
      warnings.push({
        shotId: 'scene',
        shotOrder: -1,
        field: 'total_duration',
        message: `Scene duration (${totalDuration}s) is unusually short for ${shots.length} shots. Expected at least ${expectedMin}s.`,
        severity: 'warning'
      });
    } else if (totalDuration > expectedMax) {
      warnings.push({
        shotId: 'scene',
        shotOrder: -1,
        field: 'total_duration',
        message: `Scene duration (${totalDuration}s) is very long for ${shots.length} shots. Expected no more than ${expectedMax}s. Consider splitting the scene.`,
        severity: 'warning'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Simple Levenshtein distance for typo detection
  private findClosestMatch(input: string, candidates: string[]): string | null {
    if (candidates.length === 0) return null;

    let closest = candidates[0];
    let minDistance = this.levenshteinDistance(input, candidates[0]);

    candidates.forEach(candidate => {
      const distance = this.levenshteinDistance(input, candidate);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    });

    // Only suggest if distance is < 3 (reasonable typo)
    return minDistance < 3 ? closest : null;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

export const shotValidationService = new ShotValidationService();
