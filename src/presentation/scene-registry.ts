import { MatchSceneAsset, matchSceneAssets } from '../assets/scenes/match-scene-art';
import { MatchSceneKey } from '../domain/match/types';

export interface SceneRegistry<TAsset extends { key: string }> {
  get(key: TAsset['key']): TAsset | undefined;
  getOrFallback(key: TAsset['key'], fallbackKey: TAsset['key']): TAsset;
  list(): TAsset[];
}

export class StaticSceneRegistry<TAsset extends { key: string }> implements SceneRegistry<TAsset> {
  constructor(private readonly assets: Record<string, TAsset>) {}

  get(key: TAsset['key']): TAsset | undefined {
    return this.assets[key];
  }

  getOrFallback(key: TAsset['key'], fallbackKey: TAsset['key']): TAsset {
    return this.assets[key] ?? this.assets[fallbackKey];
  }

  list(): TAsset[] {
    return Object.values(this.assets);
  }
}

export const matchSceneRegistry = new StaticSceneRegistry<MatchSceneAsset>(matchSceneAssets);

export const getMatchSceneAsset = (key: MatchSceneKey): MatchSceneAsset => matchSceneRegistry.getOrFallback(key, 'fallback');
