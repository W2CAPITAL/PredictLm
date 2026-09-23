export type NeuralTier='lite'|'smart';

export interface BrowserNeuralModel{
  tier:NeuralTier;
  label:string;
  modelId:string;
  format:'ONNX';
  runtime:'@huggingface/transformers';
  license:string;
  parameters:string;
  defaultDtype:'q4'|'q8';
  target:string;
}

export interface DesktopNeuralCandidate{
  id:string;
  label:string;
  upstream:string;
  format:'GGUF';
  runtime:'llama.cpp';
  license:string;
  parameters:string;
  status:'planned'|'license-review';
  note:string;
}

export const BROWSER_NEURAL_MODELS:Record<NeuralTier,BrowserNeuralModel>={
  lite:{
    tier:'lite',
    label:'Lite · Qwen2.5 0.5B',
    modelId:'onnx-community/Qwen2.5-0.5B-Instruct',
    format:'ONNX',
    runtime:'@huggingface/transformers',
    license:'Apache-2.0 (upstream Qwen)',
    parameters:'0.5B',
    defaultDtype:'q4',
    target:'CPU/WASM first; WebGPU is not required'
  },
  smart:{
    tier:'smart',
    label:'Smart · Qwen2.5 1.5B',
    modelId:'onnx-community/Qwen2.5-1.5B-Instruct',
    format:'ONNX',
    runtime:'@huggingface/transformers',
    license:'Apache-2.0 (upstream Qwen)',
    parameters:'1.5B',
    defaultDtype:'q4',
    target:'WebGPU preferred; CPU/WASM fallback when the machine is strong enough'
  }
};

export const DEFAULT_BROWSER_MODELS:Record<NeuralTier,string>={
  lite:BROWSER_NEURAL_MODELS.lite.modelId,
  smart:BROWSER_NEURAL_MODELS.smart.modelId
};

// Desktop candidates are architecture targets only. The current Next/Vercel app
// does not bundle these weights. A future desktop shell may embed llama.cpp and
// download or install an explicitly licensed GGUF artifact.
export const DESKTOP_NEURAL_CANDIDATES:DesktopNeuralCandidate[]=[
  {
    id:'qwen2.5-7b-instruct',
    label:'Qwen2.5 7B Instruct',
    upstream:'Qwen/Qwen2.5-7B-Instruct',
    format:'GGUF',
    runtime:'llama.cpp',
    license:'Apache-2.0',
    parameters:'7B',
    status:'planned',
    note:'Preferred quality jump for a desktop build; use a verified GGUF conversion or convert from upstream weights.'
  },
  {
    id:'phi-4-mini-instruct',
    label:'Phi-4 Mini Instruct',
    upstream:'microsoft/Phi-4-mini-instruct',
    format:'GGUF',
    runtime:'llama.cpp',
    license:'MIT',
    parameters:'3.8B-class',
    status:'planned',
    note:'Candidate for a smaller desktop runtime. Verify the exact GGUF artifact before distribution.'
  },
  {
    id:'mistral-7b-instruct-v0.3',
    label:'Mistral 7B Instruct v0.3',
    upstream:'mistralai/Mistral-7B-Instruct-v0.3',
    format:'GGUF',
    runtime:'llama.cpp',
    license:'Apache-2.0',
    parameters:'7B',
    status:'planned',
    note:'Alternative 7B desktop model; use a verified GGUF conversion or convert from upstream weights.'
  },
  {
    id:'qwen2.5-3b-instruct',
    label:'Qwen2.5 3B Instruct',
    upstream:'Qwen/Qwen2.5-3B-Instruct',
    format:'GGUF',
    runtime:'llama.cpp',
    license:'Qwen Research',
    parameters:'3B',
    status:'license-review',
    note:'Do not make this a commercial/default PredictLM model until its license is reviewed for the intended distribution.'
  }
];

export function browserModelFor(tier:NeuralTier){
  return BROWSER_NEURAL_MODELS[tier];
}
