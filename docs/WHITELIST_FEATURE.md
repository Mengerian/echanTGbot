# Whitelist Keyword Feature

This feature doesn't work with export feature, which means when we transfer echan to other vps or railway, we need to add those keyworkds manually, but we can only active this feature after we make the milestone one finished.

## Overview

The whitelist keyword feature allows users to request keywords that will bypass spam detection. Messages containing whitelisted keywords will skip all spam checks.

## Commands

| Command | Permission | Function |
|---------|-----------|----------|
| `/whitelisting <keyword>` | All users | Submit whitelist request (requires admin approval) |
| `/listwhitelist` | Admin only | View all whitelisted keywords |
| `/removewhitelist <keyword>` | Admin only | Remove keyword from whitelist |

**Examples:**
```
/whitelisting ecash
/removewhitelist ecash
/listwhitelist
```

## Workflow

1. User submits: `/whitelisting ecash`
2. Admin receives approval request in notification group
3. Admin clicks ✅ Approve or ❌ Reject
4. If approved, keyword added to whitelist
5. Messages containing "ecash" bypass spam detection

## Technical Details

### File Structure
```
src/
├── infrastructure/storage/whitelistKeywordStore.js  # levelDB storage
├── application/usecases/
│   ├── whitelistHandler.js                         # Command handlers
│   └── spamHandler.js                              # Whitelist check integration
└── presentation/router.js                           # Route registration
```

### Detection Logic

Whitelist check occurs in `spamHandler.js` **before** spam detection:
- If message contains whitelisted keyword → skip all spam checks
- Otherwise → continue normal spam detection flow

### Data Storage

**Location:** `data/whitelistKeywords/`

**Structure:**
```javascript
{
  keyword: "ecash",           // Normalized (lowercase)
  addedBy: "username",
  addedAt: "2025-11-04T..."   // ISO 8601 timestamp
}
```

## Matching Rules

- **Case-insensitive**: "eCash", "ECASH", "ecash" all match
- **Substring matching**: "ecash" matches "I love eCash!"
- **Multi-language support**: Chinese, Japanese, Unicode characters

## Notes

- All whitelist requests require admin approval
- All additions are logged with username and timestamp
- Avoid overly generic keywords to maintain spam detection efficiency
- Review whitelist periodically with `/listwhitelist`
