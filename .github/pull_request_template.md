## Scope

- Role: [ ] A Backend/Contract [ ] B Core App [ ] C iOS Native [ ] D Android Native [ ] E Mini Program
- Codex workstream: [ ] Codex A [ ] Codex B [ ] Codex C [ ] Codex D [ ] Human/Other
- Change type: [ ] bugfix [ ] small patch [ ] cleanup [ ] contract-approved feature
- Target environment: [ ] local [ ] staging [ ] production

## Contract Check

- [ ] No new backend field meaning was invented in a client.
- [ ] No new status or `target_type` / `item_type` value was invented in a client.
- [ ] RPC names and request/response types come from `packages/shared-api`.
- [ ] Business types and status enums come from `packages/shared-types` where available.
- [ ] Any contract conflict includes an A-role arbitration link.

## Boundary Check

- [ ] Role/workstream naming follows `docs/codex-workstream-mapping.md`; no ambiguous "C/D" handoff.
- [ ] `src/` changes are valid for both iOS and Android, or the platform difference is behind an adapter.
- [ ] iOS-only code is under `apps/ios/`.
- [ ] Android-only code is under `apps/android/`.
- [ ] Mini Program code is under `apps/wechat-miniprogram/`.
- [ ] Generated native assets are not reviewed as business source.
- [ ] The PR does not mix unrelated platform changes.

## Verification

- [ ] `npm run test:contracts`
- [ ] `npm run build`
- [ ] Relevant platform build or syntax check
- [ ] Relevant staging smoke/UAT

## Risk / Rollback

- Risk:
- Rollback:
