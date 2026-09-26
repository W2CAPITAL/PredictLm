import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeWetwareFrame,wetwareAdapterGate,wetwareLearningEvent} from '../src/lib/wetware-adapters';

test('wetware frames are compressed to features instead of retaining raw recordings',()=>{
  const summary=summarizeWetwareFrame({
    adapter:'finalspark-mea',
    measured:true,
    timestamp:1000,
    now:1100,
    channels:[[0,1,-1,2,-2,0],[0,.5,-.5,1,-1,0]]
  });
  assert.equal(summary.measured,true);
  assert.equal(summary.channels,2);
  assert.equal(summary.samplesPerChannel,6);
  assert.ok(summary.rms>0);
  assert.equal('data' in (summary as any),false);
  const event=wetwareLearningEvent(summary);
  assert.equal(event.metadata?.adapter,'finalspark-mea');
  assert.equal(event.kind,'cognitive');
});

test('external biological I/O requires explicit enablement and configuration',()=>{
  assert.equal(wetwareAdapterGate({adapter:'local-synthetic'}).allowed,true);
  assert.equal(wetwareAdapterGate({adapter:'cortical-cl1',externalConfigured:true}).allowed,false);
  assert.equal(wetwareAdapterGate({adapter:'finalspark-mea',explicitlyEnabled:true,externalConfigured:false}).allowed,false);
  assert.equal(wetwareAdapterGate({adapter:'finalspark-mea',explicitlyEnabled:true,externalConfigured:true}).allowed,true);
});
