# Ship Check

Run the pre-launch checklist against current state and report what's missing before submit.

## Read

./knowledge/16-pre-launch-checklist.md
CLAUDE.md  ("Build State" — accounts ready section)
./app/  (verify the codebase has key files: app.json, eas.json, etc.)
./assets/  (verify brand assets are present)

## Verify

For each section of the pre-launch checklist, attempt to verify whether it's actually done:

### Accounts & infrastructure
- Check CLAUDE.md "accounts ready" status
- Check for env vars / config files referencing each service in `app/`

### Legal
- Check for privacy policy and ToS URLs in app config
- Check for support email reference

### Brand assets
- Verify `assets/brand/` has logo files
- Verify `assets/screenshots/` has screenshots
- Verify color tokens file exists in `app/`

### App readiness
- Check key files/screens exist in `app/`
- Run typecheck if applicable
- List screens that match the 8 onboarding screens

### Pre-launch testing
- Look for TestFlight build references
- Look for Play Console internal track references

### Distribution prep
- Check for landing page reference
- Check `marketing/` for launch assets

## Output

# Cookable Ship Check

**As of:** YYYY-MM-DD
**Verdict:** [SHIP / HOLD / NOT READY]

## Done (✓)
- [bulleted list with section labels]

## Likely done but not verified (?)
- [items where there's signal but no proof]

## Missing (✗)
- [bulleted list, grouped by section, ordered by blocker severity]

## Blockers (must fix before submit)
- [hard blockers — apple cert, listing copy, paywall flow, etc.]

## Nice to have (can ship without)
- [polish items]

## Recommended next 5 actions
1. ...
2. ...
3. ...
4. ...
5. ...
