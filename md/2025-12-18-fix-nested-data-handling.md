# Fix Nested Data Property Handling in Build Endpoint

**Date:** December 18, 2025

## Issue

When users attempted to convert JSON back to EDI by pasting the full API response from the `/api/parse` endpoint, the application failed with the error:

```
{
  "error": "Build error",
  "message": "Cannot read properties of undefined (reading 'interchangeControlHeader')"
}
```

## Root Cause

The `/api/parse` endpoint returns data in this structure:

```json
{
  "success": true,
  "detectedType": "204",
  "usedType": "204",
  "segmentCount": 114,
  "data": {
    "envelope": { ... },
    "header": { ... },
    ...
  }
}
```

However, the `build()` function in the templates expects just the inner data object:

```json
{
  "envelope": { ... },
  "header": { ... },
  ...
}
```

When the full API response was sent to `/api/build`, the template tried to access `jsonData.envelope`, but `envelope` was actually nested at `jsonData.data.envelope`, causing the undefined error.

## Solution

Added a simple extraction check in the `/api/build` endpoint to handle both formats:

### File Changed: `server/index.js`

**Location:** Line 122-124

**Added Code:**
```javascript
if (data.data) {
  data = data.data;
}
```

This check detects if the incoming `data` object has a nested `data` property (indicating it's the full API response) and extracts the actual data object before passing it to the template's `build()` function.

## Benefits

1. **User-Friendly:** Users can now paste the entire JSON output from the parse endpoint without manually extracting the `data` field
2. **Backward Compatible:** Still works if users paste only the data object
3. **Simple Fix:** Single conditional check, no breaking changes
4. **Robust:** Handles both use cases seamlessly

## Testing

Users can now successfully:
1. Convert EDI → JSON using the parse endpoint
2. Copy the entire JSON response (including `success`, `detectedType`, etc.)
3. Switch to JSON → EDI mode
4. Paste the full JSON response
5. Convert back to EDI without errors

The round-trip conversion now works smoothly without requiring users to manually extract the `data` property from the API response.

## Files Modified

- `server/index.js` - Added nested data extraction logic in `/api/build` endpoint (3 lines)
