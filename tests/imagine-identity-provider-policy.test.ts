import test from 'node:test';
import assert from 'node:assert/strict';
import { identityProviderDecision } from '../src/lib/media/identity-provider-policy';
import { matchupNegativeConstraints, parseSemanticImageReview } from '../src/lib/media/canonical-matchup';

test('strict identity routing blocks text-only nano-banana for named anime characters',()=>{
  const decision=identityProviderDecision({
    providerId:'nano-banana',
    identitySensitive:true,
    strictIdentityProvider:true,
    requireReferenceTransport:true,
    referenceEvidenceAvailable:true,
    canTransportReferences:false
  });
  assert.equal(decision.allowed,false);
  assert.equal(decision.reason,'text-only-identity-provider');
});

test('strict identity routing allows Gemini when reference pixels are transported',()=>{
  const decision=identityProviderDecision({
    providerId:'gemini-nano-banana-2',
    identitySensitive:true,
    strictIdentityProvider:true,
    requireReferenceTransport:true,
    referenceEvidenceAvailable:true,
    canTransportReferences:true
  });
  assert.equal(decision.allowed,true);
});

test('identity routing rejects any provider that cannot transport available references when required',()=>{
  const decision=identityProviderDecision({
    providerId:'configured-image',
    identitySensitive:true,
    strictIdentityProvider:true,
    requireReferenceTransport:true,
    referenceEvidenceAvailable:true,
    canTransportReferences:false
  });
  assert.equal(decision.allowed,false);
  assert.equal(decision.reason,'reference-transport-required');
});

test('Naruto matchup semantic review accepts concrete identity mismatch codes',()=>{
  const prompt='Naruto modo Kurama lutando contra Sasuke com Susanoo Perfeito';
  const review=parseSemanticImageReview({
    issues:['wrong-naruto-identity','wrong-susanoo-form','wrong-color-ownership']
  },prompt);
  assert.equal(review.status,'failed');
  assert.deepEqual(review.issues,['wrong-naruto-identity','wrong-susanoo-form','wrong-color-ownership']);
  assert.match(review.retryPrompt,/spiky blond hair/i);
  assert.match(review.retryPrompt,/violet\/purple armored winged humanoid/i);
  assert.match(review.retryPrompt,/color ownership/i);
});


test('Kurama Chakra Mode does not require a separate full Kurama fox avatar',()=>{
  const prompt='Naruto Uzumaki no modo Kurama com aura dourada envolvendo o corpo lutando contra Sasuke com Susanoo Perfeito';
  const review=parseSemanticImageReview({
    issues:['missing-kurama','wrong-kurama-form','wrong-kurama-mode','wrong-naruto-identity']
  },prompt);
  assert.equal(review.status,'failed');
  assert.deepEqual(review.issues,['wrong-kurama-mode','wrong-naruto-identity']);
  assert.doesNotMatch(review.retryPrompt,/complete golden nine-tailed Kurama avatar/i);
  assert.match(review.retryPrompt,/golden-orange chakra cloak/i);
});


test('Kurama-mode negatives reject the red/dragon failure without demanding a giant fox',()=>{
  const prompt='Naruto Uzumaki no modo Kurama com aura dourada no corpo lutando contra Sasuke com Susanoo Perfeito';
  const negatives=matchupNegativeConstraints(prompt).join(' | ');
  assert.match(negatives,/red-haired Naruto/i);
  assert.match(negatives,/separate giant dragon/i);
  assert.doesNotMatch(negatives,/missing Kurama/i);
  assert.doesNotMatch(negatives,/dragon instead of Kurama/i);
});
