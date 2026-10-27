import { parsePost, inspectVisiblePost, chooseSnapshot } from '../../../extension/extractor.mjs';

// Internal preparation only. NOT imported by the extension, HTTP routes or UI.
// authorize must be a trusted worker adapter, never a member-supplied permission.
// No such adapter is registered yet: the default is always blocked.
export function createCandidateRead({ browser, identity, authorize = async () => null, now = Date.now }) {
  return async function read(targetUrl) {
    const target = parsePost(targetUrl);
    if (!target) throw new Error('invalid_target');
    const actor = structuredClone(await identity());
    if (!actor || ['memberId', 'deviceId', 'accountId', 'blogId'].some(k => typeof actor[k] !== 'string' || !actor[k])) throw new Error('identity_required');
    const binding = JSON.stringify(actor);
    const permits = async () => {
      const p = structuredClone(await authorize({ ...actor, targetUrl: target.url, operation: 'candidate_body_read' }));
      const t = now();
      if (!p || p.operation !== 'candidate_body_read' || p.targetUrl !== target.url ||
          ['memberId', 'deviceId', 'accountId', 'blogId'].some(k => p[k] !== actor[k]) ||
          typeof p.id !== 'string' || !p.id || typeof p.revision !== 'string' || !p.revision ||
          typeof p.policyReference !== 'string' || !p.policyReference.trim() ||
          !Number.isFinite(p.issuedAt) || !Number.isFinite(p.expiresAt) ||
          p.issuedAt > t || p.expiresAt <= t || p.expiresAt - p.issuedAt > 300000 || p.expiresAt <= p.issuedAt) throw new Error('permission_required');
      return p;
    };
    const permit = await permits();
    const stable = async () => {
      if (JSON.stringify(await identity()) !== binding) throw new Error('identity_changed');
      if (JSON.stringify(await permits()) !== JSON.stringify(permit)) throw new Error('permission_changed');
    };
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length !== 1 || !Number.isInteger(tabs[0].id) || parsePost(tabs[0].url)?.url !== target.url) throw new Error('target_not_active');
    const tabId = tabs[0].id;
    await stable();
    if (parsePost((await browser.tabs.get(tabId)).url)?.url !== target.url) throw new Error('target_changed');
    const results = await browser.scripting.executeScript({ target: { tabId, allFrames: true }, func: inspectVisiblePost, args: [target.blogId] });
    const snapshot = chooseSnapshot(results, target.url);
    if (typeof snapshot.title !== 'string' || !snapshot.title.trim() || snapshot.title.length > 500 ||
        typeof snapshot.body !== 'string' || !snapshot.body.trim() || snapshot.body.length > 6000 ||
        snapshot.format !== 'naver-visible-text-v1') throw new Error('invalid_or_oversized_body');
    await stable();
    const after = await browser.tabs.query({ active: true, currentWindow: true });
    if (after.length !== 1 || after[0].id !== tabId || parsePost(after[0].url)?.url !== target.url ||
        parsePost((await browser.tabs.get(tabId)).url)?.url !== target.url) throw new Error('target_changed');
    if (now() >= permit.expiresAt) throw new Error('permission_expired');
    // Preview only; does not confer copyright permission or external AI consent.
    return { snapshot, observedAt: now(), permitId: permit.id, policyReference: permit.policyReference,
      requiresMemberReview: true, rightsConfirmed: false, externalAiConsent: false };
  };
}
