import type { MochartInputConfig } from '@mochart/core';

/** A single data row in a demo's data set. */
export type DataRow = Record<string, unknown>;

/** A demo's editable chart config (the input config plus arbitrary edits). */
export type DemoConfig = MochartInputConfig & Record<string, unknown>;

/** The random-generation config (see random/*.json). */
export interface RandomConfig {
  error: { probability: number };
  group: {
    count: number;
    order: { sort: boolean };
    missing: { probability: number };
    reuse: { globalPercentage: number; stepPercentage: number };
    number: { min: number; max: number; interval: number };
    string: { minLength: number; maxLength: number };
    date: {
      min: string;
      max: string;
      interval: number;
      intervalUnit: 'second' | 'minute' | 'hour' | 'day' | string;
    };
  };
  series: {
    number: { min: number; max: number; round: boolean; limitToAxisConfig: boolean };
    missing: { probability: number };
    reuse: { global: boolean; step: boolean };
  };
}

/** One entry in the demos.json manifest, referencing files by basename. */
export interface DemoManifestEntry {
  id: string;
  title: string;
  /** One or two sentences on what the demo showcases. */
  description?: string;
  config: string;
  data: string;
  random: string;
}

/** A single demo entry assembled from its config/data/random JSON. */
export interface Demo {
  id: string;
  title: string;
  /** One or two sentences on what the demo showcases. */
  description?: string;
  config: DemoConfig;
  data: DataRow[];
  random: RandomConfig;
}

/** The assembled collection of demos loaded at startup. */
export interface DemoData {
  demoIds: string[];
  demoObjectMap: Record<string, Demo>;
  testDemoIds: string[];
}
