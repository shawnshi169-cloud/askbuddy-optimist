# Verification Contract Decision

## Current Truth

Verification is not one universal boolean. The current schema exposes several
historical signals with different scopes:

- `user_verifications.verification_type = real_name` represents an identity
  review workflow.
- `user_verifications.verification_type = talent` is a coarse legacy bucket. It
  does not distinguish education, employment, or professional qualifications.
- `experts.verification_status` represents review state for an expert profile.
  It is the canonical expert-profile workflow status.
- `experts.is_verified` is a retained legacy compatibility boolean. Historical
  migration logic used it to seed `experts.verification_status`; it is not a
  canonical claim that the whole user, every biography item, or every
  credential has been verified.
- `profiles.is_verified` is also a legacy broad signal and must not be presented
  as proof of any unspecified verification scope.

Clients must not translate `experts.is_verified = true` directly into a generic
user-facing “verified” claim.

## Required Verification Domains

The future contract must keep these domains separate:

1. **Identity verification** proves the account holder's identity. It does not
   validate education, employment, or professional competence.
2. **Education and employment verification** validates one explicit history
   claim, including organization, role or degree, period, and supporting
   evidence.
3. **Professional qualification verification** validates one credential with
   issuer, credential type, identifier where appropriate, issue date, expiry,
   and revocation state.
4. **Expert profile review** evaluates whether an expert profile may carry an
   expert-specific review badge. It may depend on verified claims, but it does
   not replace them.

## Follow-up Contract Plan

Architecture A should audit current verification consumers and evidence
retention requirements, then define a versioned claim/evidence contract before
adding schema or UI behavior. The contract should include a typed verification
domain, claim subject, review status, reviewer provenance, evidence privacy
boundary, validity period, and revocation semantics.

That follow-up may migrate or supersede the coarse `talent` workflow. Until it
is reviewed and deployed, clients may display only scope-specific status they
can prove from the canonical field. No schema migration is required for the
Product Channel fix.
