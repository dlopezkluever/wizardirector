import { shotValidationService } from '../services/shotValidationService';

describe('ShotValidationService', () => {
  describe('validateShots', () => {
    it('should error on empty shot list', () => {
      const result = shotValidationService.validateShots([]);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('at least one shot');
    });

    it('should error on missing required fields', () => {
      const shot = { 
        id: '1', shotId: '1A', shotOrder: 0, sceneId: 'scene1',
        duration: 8, action: '', camera: 'MS', setting: 'INT',
        dialogue: '', charactersForeground: [], charactersBackground: []
      };
      const result = shotValidationService.validateShots([shot]);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'action', severity: 'error' })
      );
    });

    it('should error on duration out of bounds', () => {
      const shot = { 
        id: '1', shotId: '1A', shotOrder: 0, sceneId: 'scene1',
        duration: 0.5, action: 'Walk', camera: 'MS', setting: 'INT',
        dialogue: '', charactersForeground: [], charactersBackground: []
      };
      const result = shotValidationService.validateShots([shot]);
      expect(result.errors.some(e => e.field === 'duration')).toBe(true);
    });

    it('should warn on unusual duration', () => {
      const shot = { 
        id: '1', shotId: '1A', shotOrder: 0, sceneId: 'scene1',
        duration: 2, action: 'Walk', camera: 'MS', setting: 'INT',
        dialogue: '', charactersForeground: [], charactersBackground: []
      };
      const result = shotValidationService.validateShots([shot]);
      expect(result.warnings.some(w => w.field === 'duration')).toBe(true);
    });

    it('should error on duplicate shot IDs', () => {
      const shots = [
        { id: '1', shotId: '1A', shotOrder: 0, sceneId: 'scene1', duration: 8, action: 'Walk', camera: 'MS', setting: 'INT', dialogue: '', charactersForeground: [], charactersBackground: [] },
        { id: '2', shotId: '1A', shotOrder: 1, sceneId: 'scene1', duration: 6, action: 'Talk', camera: 'CU', setting: 'INT', dialogue: '', charactersForeground: [], charactersBackground: [] }
      ];
      const result = shotValidationService.validateShots(shots);
      expect(result.errors.some(e => e.field === 'shotId')).toBe(true);
    });

    it('should warn on character name mismatch', () => {
      const shot = { 
        id: '1', shotId: '1A', shotOrder: 0, sceneId: 'scene1',
        duration: 8, action: 'Walk', camera: 'MS', setting: 'INT',
        dialogue: '', charactersForeground: ['Jhon Doe'], charactersBackground: []
      };
      const result = shotValidationService.validateShots([shot], {
        expected_characters: ['John Doe']
      });
      expect(result.warnings.some(w => w.message.includes('Did you mean'))).toBe(true);
    });
  });
});