#!/usr/bin/env tsx

import { supabase } from '../src/config/supabase.js';
import {
  DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE,
  locationResolverService,
  type LocationResolveResult,
} from '../src/services/locationResolverService.js';

interface BranchRow {
  id: string;
  project_id: string;
}

interface SceneRow {
  id: string;
  branch_id: string;
  expected_location: string | null;
}

interface ShotRow {
  id: string;
  scene_id: string;
  shot_id: string;
  setting: string | null;
  camera_direction_id: string | null;
  location_asset_id: string | null;
  location_match_source: string | null;
}

interface BackfillOptions {
  projectId?: string;
  branchId?: string;
  apply: boolean;
  threshold: number;
}

interface BackfillCounters {
  total: number;
  resolved: number;
  unresolved: number;
  ambiguous: number;
  applied: number;
  skippedManual: number;
  confidenceBuckets: Record<'high' | 'medium' | 'low' | 'none', number>;
  sourceCounts: Record<string, number>;
}

function parseArgs(argv: string[]): BackfillOptions {
  const options: BackfillOptions = {
    apply: false,
    threshold: DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--project') {
      options.projectId = argv[++i];
    } else if (arg === '--branch') {
      options.branchId = argv[++i];
    } else if (arg === '--threshold') {
      const parsed = Number(argv[++i]);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        throw new Error('--threshold must be a number between 0 and 1');
      }
      options.threshold = parsed;
    } else if (arg === '--dry-run') {
      options.apply = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Shot location backfill

Usage:
  tsx scripts/backfill-shot-locations.ts [--project <projectId>] [--branch <branchId>] [--threshold 0.90] [--apply]

Defaults to dry-run mode. Apply mode updates only non-manual shots with non-ambiguous matches at or above the threshold.
`);
}

function makeCounters(): BackfillCounters {
  return {
    total: 0,
    resolved: 0,
    unresolved: 0,
    ambiguous: 0,
    applied: 0,
    skippedManual: 0,
    confidenceBuckets: {
      high: 0,
      medium: 0,
      low: 0,
      none: 0,
    },
    sourceCounts: {},
  };
}

function confidenceBucket(result: LocationResolveResult): keyof BackfillCounters['confidenceBuckets'] {
  const confidence = result.confidence;
  if (confidence == null) return 'none';
  if (confidence >= 0.9) return 'high';
  if (confidence >= 0.72) return 'medium';
  return 'low';
}

function incrementSource(counters: BackfillCounters, source: string | null) {
  const key = source || 'none';
  counters.sourceCounts[key] = (counters.sourceCounts[key] || 0) + 1;
}

async function fetchBranches(options: BackfillOptions): Promise<BranchRow[]> {
  let query = supabase
    .from('branches')
    .select('id, project_id')
    .order('created_at', { ascending: true });

  if (options.branchId) {
    query = query.eq('id', options.branchId);
  }
  if (options.projectId) {
    query = query.eq('project_id', options.projectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch branches: ${error.message}`);
  return (data || []) as BranchRow[];
}

async function fetchScenes(branchId: string): Promise<SceneRow[]> {
  const { data, error } = await supabase
    .from('scenes')
    .select('id, branch_id, expected_location')
    .eq('branch_id', branchId)
    .order('scene_number', { ascending: true });

  if (error) throw new Error(`Failed to fetch scenes for branch ${branchId}: ${error.message}`);
  return (data || []) as SceneRow[];
}

async function fetchShots(sceneIds: string[]): Promise<ShotRow[]> {
  if (sceneIds.length === 0) return [];

  const { data, error } = await supabase
    .from('shots')
    .select('id, scene_id, shot_id, setting, camera_direction_id, location_asset_id, location_match_source')
    .in('scene_id', sceneIds)
    .order('shot_order', { ascending: true });

  if (error) throw new Error(`Failed to fetch shots: ${error.message}`);
  return (data || []) as ShotRow[];
}

function summarizeResult(counters: BackfillCounters, result: LocationResolveResult) {
  counters.confidenceBuckets[confidenceBucket(result)]++;
  incrementSource(counters, result.source);

  if (result.isAmbiguous) {
    counters.ambiguous++;
  } else if (result.locationAssetId) {
    counters.resolved++;
  } else {
    counters.unresolved++;
  }
}

async function applyBackfill(
  branch: BranchRow,
  scene: SceneRow,
  shot: ShotRow,
  result: LocationResolveResult,
  threshold: number
): Promise<boolean> {
  const wasApplied = locationResolverService.shouldApplyResolution(result, threshold);
  if (!wasApplied) return false;

  const patch = locationResolverService.toShotLocationPatch(result, {
    threshold,
    sourceOverride: result.source === 'camera_direction_parent' ? 'camera_direction_parent' : 'legacy_backfill',
  });

  const { error } = await supabase
    .from('shots')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shot.id);

  if (error) throw new Error(`Failed to update shot ${shot.id}: ${error.message}`);

  await locationResolverService.recordMatchEvent({
    projectId: branch.project_id,
    branchId: branch.id,
    sceneId: scene.id,
    shotId: shot.id,
    rawSetting: shot.setting,
    sceneExpectedLocation: scene.expected_location,
    cameraDirectionId: shot.camera_direction_id,
    result,
    wasApplied,
  });

  return true;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const counters = makeCounters();
  const branches = await fetchBranches(options);

  console.log(`Shot location backfill ${options.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Branches: ${branches.length}`);
  console.log(`Apply threshold: ${options.threshold.toFixed(3)}`);

  for (const branch of branches) {
    const context = await locationResolverService.loadProjectLocationContext(branch.id);
    const scenes = await fetchScenes(branch.id);
    const scenesById = new Map(scenes.map(scene => [scene.id, scene]));
    const shots = await fetchShots(scenes.map(scene => scene.id));

    for (const shot of shots) {
      counters.total++;
      const scene = scenesById.get(shot.scene_id);
      if (!scene) continue;

      if (shot.location_match_source === 'manual') {
        counters.skippedManual++;
        continue;
      }

      const result = locationResolverService.resolveShotLocation(
        {
          setting: shot.setting,
          sceneExpectedLocation: scene.expected_location,
          cameraDirectionId: shot.camera_direction_id,
        },
        context
      );

      summarizeResult(counters, result);

      if (options.apply) {
        const applied = await applyBackfill(branch, scene, shot, result, options.threshold);
        if (applied) counters.applied++;
      }
    }
  }

  console.log('');
  console.log('Report');
  console.log(`  total shots: ${counters.total}`);
  console.log(`  resolved: ${counters.resolved}`);
  console.log(`  unresolved: ${counters.unresolved}`);
  console.log(`  ambiguous: ${counters.ambiguous}`);
  console.log(`  applied: ${counters.applied}`);
  console.log(`  skipped manual: ${counters.skippedManual}`);
  console.log('  confidence buckets:');
  console.log(`    high: ${counters.confidenceBuckets.high}`);
  console.log(`    medium: ${counters.confidenceBuckets.medium}`);
  console.log(`    low: ${counters.confidenceBuckets.low}`);
  console.log(`    none: ${counters.confidenceBuckets.none}`);
  console.log('  sources:');
  for (const [source, count] of Object.entries(counters.sourceCounts).sort()) {
    console.log(`    ${source}: ${count}`);
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
