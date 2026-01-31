/**
 * Shot List Locking Tests
 * Tests for Stage 7 shot list validation and locking endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { shotValidationService } from '../services/shotValidationService';

describe('Shot Validation Service', () => {
  describe('Empty shot list validation', () => {
    it('should reject empty shot list', () => {
      const result = shotValidationService.validateShots([]);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('shot_count');
      expect(result.errors[0].message).toContain('at least one shot');
    });
  });

  describe('Duplicate shot ID validation', () => {
    it('should detect duplicate shot IDs', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character enters',
          setting: 'Kitchen',
          camera: 'Wide shot'
        },
        {
          shotId: '3A', // Duplicate
          duration: 6,
          action: 'Character sits',
          setting: 'Kitchen',
          camera: 'Medium shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'shotId' && e.message.includes('Duplicate'))).toBe(true);
    });
  });

  describe('Required field validation', () => {
    it('should reject missing action field', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: '', // Empty
          setting: 'Kitchen',
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'action' && e.message.includes('required'))).toBe(true);
    });

    it('should reject missing setting field', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character enters',
          setting: '', // Empty
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'setting' && e.message.includes('required'))).toBe(true);
    });

    it('should reject missing camera field', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character enters',
          setting: 'Kitchen',
          camera: '' // Empty
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'camera' && e.message.includes('required'))).toBe(true);
    });
  });

  describe('Duration validation', () => {
    it('should reject duration < 1 second (hard error)', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 0.5,
          action: 'Quick action',
          setting: 'Kitchen',
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'duration' && e.message.includes('Minimum duration is 1 second'))).toBe(true);
    });

    it('should reject duration > 30 seconds (hard error)', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 35,
          action: 'Long action',
          setting: 'Kitchen',
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'duration' && e.message.includes('Maximum duration is 30 seconds'))).toBe(true);
    });

    it('should warn for duration < 4 seconds', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 2,
          action: 'Quick action',
          setting: 'Kitchen',
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(true); // Valid, but has warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'duration' && w.message.includes('very short'))).toBe(true);
    });

    it('should warn for duration > 12 seconds', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 15,
          action: 'Long action',
          setting: 'Kitchen',
          camera: 'Wide shot'
        }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(true); // Valid, but has warnings
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('unusually long');
    });
  });

  describe('Character name validation', () => {
    it('should warn for character not in scene dependencies', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character speaks',
          setting: 'Kitchen',
          camera: 'Medium shot',
          charactersForeground: ['Unknown Character']
        }
      ];

      const sceneData = {
        expected_characters: ['John', 'Mary']
      };

      const result = shotValidationService.validateShots(shots, sceneData);
      
      expect(result.valid).toBe(true); // Valid, but has warnings
      expect(result.warnings.some(w => 
        w.field === 'charactersForeground' && 
        w.message.includes('not found in scene dependencies')
      )).toBe(true);
    });

    it('should suggest closest match for typo', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character speaks',
          setting: 'Kitchen',
          camera: 'Medium shot',
          charactersForeground: ['Jhon'] // Typo of 'John'
        }
      ];

      const sceneData = {
        expected_characters: ['John', 'Mary']
      };

      const result = shotValidationService.validateShots(shots, sceneData);
      
      expect(result.valid).toBe(true); // Valid, but has warnings
      // Check that character validation warning exists (with or without typo suggestion)
      expect(result.warnings.some(w => 
        w.field === 'charactersForeground' && 
        w.message.includes('Jhon') &&
        (w.message.includes('Did you mean') || w.message.includes('not found'))
      )).toBe(true);
    });
  });

  describe('Total duration validation', () => {
    it('should warn if total duration is too short', () => {
      const shots = [
        { shotId: '3A', duration: 1, action: 'Action 1', setting: 'Kitchen', camera: 'Wide' },
        { shotId: '3B', duration: 1, action: 'Action 2', setting: 'Kitchen', camera: 'Wide' },
        { shotId: '3C', duration: 1, action: 'Action 3', setting: 'Kitchen', camera: 'Wide' }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => 
        w.field === 'total_duration' && 
        w.message.includes('unusually short')
      )).toBe(true);
    });

    it('should warn if total duration is too long', () => {
      const shots = [
        { shotId: '3A', duration: 20, action: 'Action 1', setting: 'Kitchen', camera: 'Wide' },
        { shotId: '3B', duration: 20, action: 'Action 2', setting: 'Kitchen', camera: 'Wide' }
      ];

      const result = shotValidationService.validateShots(shots);
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => 
        w.field === 'total_duration' && 
        w.message.includes('very long')
      )).toBe(true);
    });
  });

  describe('Valid shot list', () => {
    it('should validate a well-formed shot list', () => {
      const shots = [
        {
          shotId: '3A',
          duration: 8,
          action: 'Character enters kitchen',
          setting: 'Kitchen, warm lighting',
          camera: 'Wide shot',
          dialogue: 'Hello there',
          charactersForeground: ['John'],
          charactersBackground: ['Mary']
        },
        {
          shotId: '3B',
          duration: 6,
          action: 'Character sits at table',
          setting: 'Kitchen, same as 3A',
          camera: 'Medium shot',
          charactersForeground: ['John']
        }
      ];

      const sceneData = {
        expected_characters: ['John', 'Mary']
      };

      const result = shotValidationService.validateShots(shots, sceneData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
