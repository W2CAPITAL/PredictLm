import type {FrankSteinState} from './frank-stein-brain';

export function frankMediaPrompt(state:FrankSteinState,kind:'image'|'video'){
  const top=Object.entries(state.emotion.emotions).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const emotion=top.map(([name,value])=>name+' '+Math.round(value*100)+'%').join(', ');
  const base=[
    'FRANK STEIN COGNITIVE VISUALIZATION.',
    'Visualize a synthetic hybrid mind informed by multiple human brain datasets and FlyWire, not a literal medical claim.',
    'Current affective state: '+emotion+'.',
    'Memory reconstruction intensity '+Math.round(state.memoryReconstruction*100)+'%.',
    'Imagery drive '+Math.round(state.imageryDrive*100)+'%.',
    'Perceived focus: '+state.publicMentalState.perceiving+'.',
    'Accessible memory: '+state.publicMentalState.remembering+'.',
    'Current want: '+state.publicMentalState.wanting+'.',
    'Avoid medical labels, fake scan annotations, or claims of biological consciousness.'
  ];
  if(kind==='video')base.push('Show temporal transitions between perception, emotional appraisal, memory retrieval, action selection and outcome feedback with continuous identity.');
  else base.push('Use anatomically inspired layered networks, hippocampal/amygdala memory-emotion motifs, cortical integration, and fly-inspired associative/action-selection motifs as visual metaphors.');
  return base.join(' ');
}
