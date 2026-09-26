import test from 'node:test';
import assert from 'node:assert/strict';
import {extractOpenAIResponsesText,openAIResponsesInput,openAIResponsesRequest} from '../src/lib/server/openai-responses';

test('OpenAI Responses adapter preserves conversation roles and text',()=>{
  const input=openAIResponsesInput([
    {role:'system',content:'You are PredictLM BioAI.'},
    {role:'user',content:'Repair this app.'}
  ]);
  assert.equal(input.length,2);
  assert.equal(input[0].role,'system');
  assert.equal(input[1].content[0].text,'Repair this app.');
});

test('OpenAI Responses request targets the configured GPT model without storing server responses',()=>{
  const previous=process.env.OPENAI_REASONING_EFFORT;
  process.env.OPENAI_REASONING_EFFORT='high';
  const request=openAIResponsesRequest(
    {name:'openai',base:'https://api.openai.com/v1',key:'test',model:'gpt-5.6-sol',protocol:'openai-responses'},
    [{role:'user',content:'hello'}],
    {deep:true,maxTokens:900}
  );
  assert.equal(request.model,'gpt-5.6-sol');
  assert.equal(request.reasoning.effort,'high');
  assert.equal(request.max_output_tokens,900);
  assert.equal(request.store,false);
  if(previous===undefined)delete process.env.OPENAI_REASONING_EFFORT;
  else process.env.OPENAI_REASONING_EFFORT=previous;
});

test('OpenAI Responses parser accepts raw output arrays and output_text convenience field',()=>{
  assert.equal(extractOpenAIResponsesText({output_text:'direct answer'}),'direct answer');
  const parsed=extractOpenAIResponsesText({
    output:[
      {type:'reasoning',summary:[]},
      {type:'message',content:[
        {type:'output_text',text:'part one'},
        {type:'output_text',text:'part two'}
      ]}
    ]
  });
  assert.equal(parsed,'part one\npart two');
});
