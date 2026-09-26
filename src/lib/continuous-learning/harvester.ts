import type {LearningRecord} from './types';
import {deduplicateLearning} from './deduplicator';
import {distillLearningRecord} from './distiller';
import {learningStatus,sourceTrust} from './source-trust';
export function harvestLearning(previous:LearningRecord[],incoming:LearningRecord[],threshold=.74){const normalized=incoming.map(record=>{const confidence=record.confidence>0?record.confidence:sourceTrust({kind:record.kind,official:record.official,allowlisted:record.allowlisted,license:record.license,quarantined:record.quarantined});const enriched={...record,confidence};return distillLearningRecord({...enriched,status:learningStatus(enriched,threshold)})});return deduplicateLearning(previous,normalized)}
