# JSON to EDI Conversion Implementation

**Date:** December 18, 2025

## Overview

Added bidirectional conversion capability to the X12 EDI parser application. Users can now convert from JSON back to EDI format (X12) in addition to the existing EDI to JSON conversion.

## Changes Made

### 1. **src/utils.js** - Reverse Mapping Functions

Added reverse lookup functionality to convert human-readable names back to EDI codes:

- **Reverse Mapping Objects:**
  - `DATE_QUALIFIERS_REVERSE` - Maps date qualifier names to codes
  - `STOP_REASON_CODES_REVERSE` - Maps stop types to reason codes
  - `ENTITY_ID_CODES_REVERSE` - Maps entity names to ID codes

- **Reverse Lookup Functions:**
  - `getDateQualifierCode(name)` - Get code from qualifier name
  - `getStopReasonCode(type)` - Get code from stop type
  - `getEntityIdCode(name)` - Get code from entity name

- **Date/Time Unformatting:**
  - `unformatDate(dateStr)` - Converts "2024-12-18" to "20241218"
  - `unformatTime(timeStr)` - Converts "14:30" to "1430"

- **Padding Utilities:**
  - `padLeft(str, length, char)` - Left-pad strings
  - `padRight(str, length, char)` - Right-pad strings

### 2. **src/ediWriter.js** - EDI Building Functions (NEW FILE)

Created core EDI writing infrastructure:

- **Segment Building:**
  - `buildSegment(identifier, elements, fieldDelimiter)` - Constructs EDI segments
  - `assembleEDI(segments, segmentDelimiter)` - Joins segments with delimiters

- **Envelope Functions:**
  - `buildISA()` - Interchange Control Header
  - `buildGS()` - Functional Group Header
  - `buildST()` - Transaction Set Header
  - `buildSE()` - Transaction Set Trailer
  - `buildGE()` - Functional Group Trailer
  - `buildIEA()` - Interchange Control Trailer

### 3. **src/templates/edi204.js** - EDI 204 Builder

Added `build(jsonData, meta)` export function to convert JSON to EDI 204 (Motor Carrier Load Tender):

- **Header Building:**
  - `buildB2()` - Shipment info
  - `buildB2A()` - Purpose code
  - `buildL11()` - References
  - `buildAT5()` - Bill of lading handling

- **Entity Building:**
  - `buildN1()` - Entity identification
  - `buildN3()` - Address
  - `buildN4()` - City/State/Zip

- **Stop Building:**
  - `buildStop()` - Constructs all stop segments (S5, G62, AT8, location, line items)
  - `buildLineItem()` - Constructs line item segments (L5, AT8, G61, L11, hazmat segments)

- **Totals:**
  - `buildL3()` - Total weight and charges

### 4. **src/templates/edi214.js** - EDI 214 Builder

Added `build(jsonData, meta)` export function to convert JSON to EDI 214 (Transportation Carrier Shipment Status):

- **Header Building:**
  - `buildB10()` - Shipment status info
  - `buildL11()` - References
  - `buildAT5()` - Status handling

- **Shipment Entities:**
  - `buildN1()`, `buildN3()`, `buildN4()` - Entity information

- **Stop Building:**
  - `buildStop()` - Constructs stop segments (LX, AT7 events, references)

### 5. **client/src/main.js** - Frontend Mode Switching

Updated frontend to support both conversion modes:

- **Mode Selector:**
  - Added event listener for mode dropdown
  - Dynamic UI updates based on selected mode

- **UI Updates:**
  - `updateUI()` - Changes button labels and placeholders based on mode
    - "Copy JSON" / "Copy EDI"
    - "Download JSON" / "Download EDI"
    - Textarea placeholder changes

- **Conversion Logic:**
  - EDI → JSON: Calls `/api/parse` endpoint (existing)
  - JSON → EDI: Parses JSON input, calls `/api/build` endpoint (new)
  - Error handling for invalid JSON and missing template selection

- **Download Handler:**
  - Dynamic filename based on mode (output.json or output.edi)
  - Dynamic MIME type (application/json or text/plain)

### 6. **server/index.js** - Enhanced Build Endpoint

Improved `/api/build` endpoint with comprehensive error handling:

- **Validation:**
  - Checks for required type parameter
  - Checks for required data parameter
  - Validates template exists
  - Verifies template has build() function

- **Error Responses:**
  - Clear error messages for missing parameters
  - Lists available template types
  - Detailed error information

- **Success Response:**
  - Returns built EDI string
  - Includes success flag and type confirmation

## How It Works

### JSON to EDI Flow:

1. User selects "JSON → EDI" mode
2. User pastes JSON (from previous EDI→JSON conversion)
3. User selects transaction type (204 or 214)
4. User clicks "Convert"
5. Frontend parses JSON and sends to `/api/build`
6. Server calls appropriate template's `build()` function
7. Template constructs EDI segments from JSON structure
8. EDI string is returned and displayed
9. User can copy or download the EDI file

### Key Features:

- **Round-trip Conversion:** EDI → JSON → EDI produces equivalent output
- **Flexible Delimiters:** Supports custom field and segment delimiters via meta parameter
- **Optional Fields:** Properly omits segments/elements that are null/undefined
- **Standards Compliant:** Follows X12 EDI standards for field padding and formatting
- **Template-based:** Each transaction type has its own builder implementation

## Testing

To test the implementation:

1. Start the server: `npm start`
2. Convert an EDI file to JSON
3. Copy the JSON output
4. Switch mode to "JSON → EDI"
5. Paste the JSON
6. Select the same template type
7. Convert back to EDI
8. Compare with original EDI file

## Files Modified

- `src/utils.js` - Added reverse mapping and formatting functions
- `src/ediWriter.js` - Created new file with EDI building utilities
- `src/templates/edi204.js` - Added build() function and helpers
- `src/templates/edi214.js` - Added build() function and helpers
- `client/src/main.js` - Added mode switching logic
- `server/index.js` - Enhanced /api/build endpoint

## Future Enhancements

- Add validation for JSON structure before building
- Support for additional transaction types (210, 990, etc.)
- Configurable output formatting options
- Schema validation for input JSON
