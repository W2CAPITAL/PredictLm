import test from 'node:test';
import assert from 'node:assert/strict';
import {
  agenticReviewEnabled,
  createProviderTurnBudget,
  providerCostClass,
  repairCallsEnabled,
  resetProviderBudgetForTests
} from '../src/lib/server/provider-budget';

const envKeys=[
  'PREDICTLM_API_BUDGET_MODE',
  'PREDICTLM_MAX_REMOTE_CALLS_PER_TURN',
  'PREDICTLM_MAX_METERED_CALLS_PER_TURN',
  'PREDICTLM_PROVIDER_SOFT_DAILY_CALL_CAP',
  'PREDICTLM_SESSION_DAILY_REMOTE_CALL_CAP',
  'PREDICTLM_ENABLE_AGENTIC_REVIEW',
  'PREDICTLM_ENABLE_REPAIR_CALLS'
];

function clear(){
  for(const key of envKeys)delete process.env[key];
  resetProviderBudgetForTests();
}

test('conservative mode allows one metered provider and prevents hidden paid fan-out',()=>{
  clear();
  process.env.PREDICTLM_API_BUDGET_MODE='conservative';
  process.env.PREDICTLM_MAX_REMOTE_CALLS_PER_TURN='3';
  process.env.PREDICTLM_MAX_METERED_CALLS_PER_TURN='1';
  const budget=createProviderTurnBudget('session-a');

  assert.deepEqual(
    budget.reserve({name:'gemini',model:'gemini-3.8-flash'},1200,'answer'),
    {ok:true}
  );
  const second=budget.reserve({name:'deepseek',model:'deepseek-chat'},1200,'review');
  assert.equal(second.ok,false);
  assert.equal((second as any).reason,'turn-metered-call-budget');

  assert.deepEqual(
    budget.reserve({name:'groq',model:'openai/gpt-oss-120b'},900,'fallback'),
    {ok:true}
  );
  assert.equal(budget.usedMeteredCalls,1);
  assert.equal(budget.usedTotalCalls,2);
  clear();
});

test('provider budget classifies self-hosted/free bridges separately from metered APIs',()=>{
  assert.equal(providerCostClass({name:'localcode',model:'gateway'}),'local-or-free');
  assert.equal(providerCostClass({name:'gptoss',model:'gpt-oss-20b'}),'local-or-free');
  assert.equal(providerCostClass({name:'puterpool',model:'qwen'}),'local-or-free');
  assert.equal(providerCostClass({name:'groq',model:'openai/gpt-oss-120b'}),'free-tier');
  assert.equal(providerCostClass({name:'openrouter',model:'openrouter/auto'}),'metered');
  assert.equal(providerCostClass({name:'gemini',model:'gemini-3.8-flash'}),'metered');
});

test('soft provider daily cap blocks repeated calls on the same server instance',()=>{
  clear();
  process.env.PREDICTLM_PROVIDER_SOFT_DAILY_CALL_CAP='1';
  process.env.PREDICTLM_SESSION_DAILY_REMOTE_CALL_CAP='10';
  process.env.PREDICTLM_MAX_REMOTE_CALLS_PER_TURN='2';
  process.env.PREDICTLM_MAX_METERED_CALLS_PER_TURN='2';

  const first=createProviderTurnBudget('one');
  assert.equal(first.reserve({name:'gemini',model:'gemini-3.8-flash'},500).ok,true);

  const second=createProviderTurnBudget('two');
  const blocked=second.reserve({name:'gemini',model:'gemini-3.8-flash'},500);
  assert.equal(blocked.ok,false);
  assert.equal((blocked as any).reason,'provider-soft-daily-call-cap');
  clear();
});

test('remote review and repair are disabled by default and require explicit quality policy',()=>{
  clear();
  assert.equal(agenticReviewEnabled(),false);
  assert.equal(repairCallsEnabled(),false);

  process.env.PREDICTLM_API_BUDGET_MODE='quality';
  assert.equal(agenticReviewEnabled(),true);
  assert.equal(repairCallsEnabled(),true);

  process.env.PREDICTLM_ENABLE_AGENTIC_REVIEW='false';
  process.env.PREDICTLM_ENABLE_REPAIR_CALLS='false';
  assert.equal(agenticReviewEnabled(),false);
  assert.equal(repairCallsEnabled(),false);
  clear();
});
