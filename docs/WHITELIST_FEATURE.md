# Whitelist Keyword Feature

## Overview

The whitelist keyword feature allows users to request keywords that will bypass spam detection. Messages containing whitelisted keywords will not be checked by the spam detection system.

## Commands

### User Commands

#### `/whitelisting <keyword>`
Submit a keyword for whitelisting.

**Examples:**
```
/whitelisting ecash
/whitelisting bitcoin
/whitelisting special event
```

**Features:**
- Supports any language (English, Chinese, Japanese, etc.)
- Can include spaces (multi-word phrases)
- Case-insensitive matching

### Admin Commands

#### `/listwhitelist`
View all whitelisted keywords.

**Example output:**
```
📋 Whitelisted Keywords:

1. "ecash"
   Added by: user123
   Added at: 2025-11-04 10:30:00

2. "bitcoin"
   Added by: user456
   Added at: 2025-11-04 11:15:00
```

#### `/removewhitelist <keyword>`
Remove a keyword from the whitelist.

**Examples:**
```
/removewhitelist ecash
/removewhitelist special event
```

## Workflow

### 1. User Submits Request
User sends the command in any chat:
```
/whitelisting ecash
```

### 2. Admin Approval
The bot sends an approval request to the notification group with two buttons:
- ✅ Approve
- ❌ Reject

### 3. Approval Takes Effect
If approved, the keyword is added to the levelDB database. Any message containing this keyword will automatically bypass spam detection.

### 4. Admin Management
Admins can view all keywords with `/listwhitelist` and remove them with `/removewhitelist <keyword>`.

## Technical Details

### File Structure
```
src/
├── infrastructure/
│   └── storage/
│       └── whitelistKeywordStore.js      # levelDB storage layer
├── application/
│   └── usecases/
│       ├── whitelistHandler.js           # Command handlers
│       └── spamHandler.js                # Integrated whitelist check
└── presentation/
    └── router.js                          # Route registration
```

### Detection Logic

Whitelist checking occurs in `spamHandler.js` before spam detection:

1. Build message content (text, quotes, forwards)
2. Check for empty messages
3. **✅ Check whitelist** - If message contains whitelisted keyword, skip all subsequent checks
4. Check port availability
5. Check target member presence
6. Blacklisted channel check
7. Similarity check
8. AI spam detection

### Data Storage

Data is stored in levelDB at:
```
data/whitelistKeywords/
```

**Data structure:**
```javascript
{
  keyword: "ecash",           // Normalized keyword (lowercase)
  addedBy: "username",        // Username who added it
  addedAt: "2025-11-04T..."   // ISO 8601 timestamp
}
```

## Matching Rules

- **Case-insensitive**: "eCash", "ECASH", "ecash" all match
- **Substring matching**: Keyword "ecash" matches "I love eCash!"
- **Multi-language support**: Supports Chinese, Japanese, and any Unicode characters

## Security Considerations

1. **Admin Approval Required** - All whitelist keywords require admin approval
2. **Audit Log** - All additions are logged with username and timestamp
3. **Add/Remove Only** - Supports both adding and removing keywords

## Usage Examples

### Scenario 1: Activity Discussion Flagged as Spam

**Problem:** Users discussing a specific project or activity are frequently flagged as spam.

**Solution:**
```
/whitelisting [project name]
```

After admin approval, messages containing the project name will no longer be detected.

### Scenario 2: Common Words Misidentified

**Problem:** Certain normal words are misidentified as spam by AI.

**Solution:**
```
/whitelisting [word]
```

### Scenario 3: View Current Whitelist

**Admin action:**
```
/listwhitelist
```

### Scenario 4: Remove Keyword

**Admin action:**
```
/removewhitelist [keyword]
```

## Maintenance Recommendations

1. **Regular Review** - Use `/listwhitelist` to periodically review added keywords
2. **Careful Approval** - Overly generic keywords may reduce spam detection efficiency
3. **Consider Temporality** - Some keywords may only be needed for specific periods (e.g., during events)
4. **Clean Up** - Use `/removewhitelist` to remove keywords that are no longer needed

## Complete Command Reference

| Command | Permission | Function |
|---------|-----------|----------|
| `/whitelisting <keyword>` | All users | Submit whitelist request (requires admin approval) |
| `/listwhitelist` | Admin only | View all whitelisted keywords |
| `/removewhitelist <keyword>` | Admin only | Remove keyword from whitelist |

## Complete Management Workflow

```
1. User submits: /whitelisting ecash
         ↓
2. Admin sees request in notification group
         ↓
3. Admin clicks ✅ Approve button
         ↓
4. Keyword is added to whitelist
         ↓
5. Messages with "ecash" bypass spam detection
         ↓
6. Later, if removal needed:
         ↓
7. Admin executes: /removewhitelist ecash
         ↓
8. Keyword removed, detection resumes
```

## Future Improvements

- [ ] Add expiration time (temporary whitelist)
- [ ] Add regex pattern support
- [ ] Add whitelist usage statistics
- [ ] Batch import/export functionality
