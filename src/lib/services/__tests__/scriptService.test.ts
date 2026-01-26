/**
 * Tests for scriptService slug generation (Task 3)
 * 
 * To run these tests, you'll need to set up Vitest:
 * npm install -D vitest @vitest/ui
 * 
 * Then add to package.json:
 * "test": "vitest",
 * "test:ui": "vitest --ui"
 */

import { describe, it, expect } from 'vitest';
import { scriptService } from '../scriptService';

describe('Slug Generation (Task 3)', () => {
  describe('extractScenes - Slug Format', () => {
    it('should generate slug with type, location, timeOfDay, and sceneNumber', () => {
      const script = `INT. KITCHEN - DAY

John enters the kitchen.

EXT. CITY STREET - NIGHT

The street is dark and empty.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(2);
      expect(scenes[0].slug).toBe('int-kitchen-day-1');
      expect(scenes[1].slug).toBe('ext-city-street-night-2');
    });

    it('should generate slug without timeOfDay when not present', () => {
      const script = `INT. BEDROOM

Sarah wakes up.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-bedroom-1');
    });

    it('should handle multi-word locations correctly', () => {
      const script = `INT. COFFEE SHOP - MORNING

The barista prepares coffee.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-coffee-shop-morning-1');
    });

    it('should handle multi-word time of day (MOMENTS LATER)', () => {
      const script = `INT. OFFICE - MOMENTS LATER

John sits at his desk.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-office-moments-later-1');
    });

    it('should ensure uniqueness with scene number for duplicate locations', () => {
      const script = `INT. KITCHEN - DAY

First scene in kitchen.

INT. KITCHEN - DAY

Second scene in kitchen.

INT. KITCHEN - NIGHT

Third scene in kitchen at night.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(3);
      expect(scenes[0].slug).toBe('int-kitchen-day-1');
      expect(scenes[1].slug).toBe('int-kitchen-day-2');
      expect(scenes[2].slug).toBe('int-kitchen-night-3');
    });

    it('should sanitize special characters in location', () => {
      const script = `INT. JOHN'S APARTMENT - DAY

The apartment is messy.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-johns-apartment-day-1');
    });

    it('should handle CONTINUOUS time of day', () => {
      const script = `INT. HALLWAY - CONTINUOUS

John walks down the hall.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-hallway-continuous-1');
    });

    it('should handle LATER time of day', () => {
      const script = `EXT. PARK - LATER

The park is now empty.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('ext-park-later-1');
    });

    it('should handle DAWN and DUSK time of day', () => {
      const script = `EXT. BEACH - DAWN

The sun rises.

EXT. BEACH - DUSK

The sun sets.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(2);
      expect(scenes[0].slug).toBe('ext-beach-dawn-1');
      expect(scenes[1].slug).toBe('ext-beach-dusk-2');
    });

    it('should handle complex location names with numbers', () => {
      const script = `INT. APARTMENT 4B - DAY

The apartment is small.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(1);
      expect(scenes[0].slug).toBe('int-apartment-4b-day-1');
    });

    it('should maintain sequential scene numbering', () => {
      const script = `INT. ROOM 1 - DAY
Scene 1.

INT. ROOM 2 - DAY
Scene 2.

INT. ROOM 3 - DAY
Scene 3.`;

      const scenes = scriptService.extractScenes(script);
      
      expect(scenes).toHaveLength(3);
      expect(scenes[0].sceneNumber).toBe(1);
      expect(scenes[1].sceneNumber).toBe(2);
      expect(scenes[2].sceneNumber).toBe(3);
      expect(scenes[0].slug).toBe('int-room-1-day-1');
      expect(scenes[1].slug).toBe('int-room-2-day-2');
      expect(scenes[2].slug).toBe('int-room-3-day-3');
    });
  });
});

