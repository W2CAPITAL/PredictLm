import type {LearningProposal,ResearchGap} from './types';
export function prioritizeGaps(gaps:ResearchGap[],limit=8){return gaps.filter(x=>x.status==='open').sort((a,b)=>b.priority-a.priority).slice(0,limit)}
export function prioritizeProposals(proposals:LearningProposal[],limit=20){const risk={low:0,medium:1,high:2};return[...proposals].sort((a,b)=>risk[a.risk]-risk[b.risk]||a.topic.localeCompare(b.topic)).slice(0,limit)}
