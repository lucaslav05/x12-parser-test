import { FieldMap, LoopMap, Loop, Transaction } from "node-x12-edi";
import { readFile, writeFile } from "fs/promises";

// ======================
// Create Loops
// ======================

// Party loop (N1)
const partyLoop = new Loop();
partyLoop.setPosition(0);
partyLoop.addSegmentIdentifiers(["N1", "N3", "N4"]);

// Stop loop (S5 → nested orders OID)
const orderLoop = new Loop();
orderLoop.setPosition(0);
orderLoop.addSegmentIdentifiers(["OID", "L5"]);

const stopLoop = new Loop();
stopLoop.setPosition(0);
stopLoop.addSegmentIdentifiers(["S5", "G62", "N1", "N3", "N4", "OID", "L5"]);

// ======================
// Mapping Logic
// ======================
const edi204MapLogic = {
  transactionSet: "204",
  version: "004010",

  header: {
    shipmentId: new FieldMap({ segmentIdentifier: "B2", valuePosition: 3 }),
    carrierSCAC: new FieldMap({ segmentIdentifier: "B2", valuePosition: 2 }),
    tenderDate: new FieldMap({ segmentIdentifier: "B2A", valuePosition: 1 }),
    paymentMethod: new FieldMap({ segmentIdentifier: "B2", valuePosition: 4 })
  },

  parties: new LoopMap({
    position: 0,
    values: {
      entityId: new FieldMap({ segmentIdentifier: "N1", valuePosition: 1 }),
      name: new FieldMap({ segmentIdentifier: "N1", valuePosition: 2 }),
      idCode: new FieldMap({ segmentIdentifier: "N1", valuePosition: 4 }),
      addressLine1: new FieldMap({ segmentIdentifier: "N3", valuePosition: 1 }),
      city: new FieldMap({ segmentIdentifier: "N4", valuePosition: 1 }),
      state: new FieldMap({ segmentIdentifier: "N4", valuePosition: 2 }),
      postalCode: new FieldMap({ segmentIdentifier: "N4", valuePosition: 3 }),
      country: new FieldMap({ segmentIdentifier: "N4", valuePosition: 4 })
    }
  }),

  stops: new LoopMap({
    position: 0,
    values: {
      stopSequence: new FieldMap({ segmentIdentifier: "S5", valuePosition: 1 }),
      stopType: new FieldMap({ segmentIdentifier: "S5", valuePosition: 2 }),

      earliestDate: new FieldMap({ segmentIdentifier: "G62", qualifier: "37", valuePosition: 2 }),
      latestDate: new FieldMap({ segmentIdentifier: "G62", qualifier: "38", valuePosition: 2 }),

      locationName: new FieldMap({ segmentIdentifier: "N1", valuePosition: 2 }),
      locationAddress: new FieldMap({ segmentIdentifier: "N3", valuePosition: 1 }),
      locationCity: new FieldMap({ segmentIdentifier: "N4", valuePosition: 1 }),
      locationState: new FieldMap({ segmentIdentifier: "N4", valuePosition: 2 }),
      locationPostalCode: new FieldMap({ segmentIdentifier: "N4", valuePosition: 3 }),

      orders: new LoopMap({
        position: 0,
        values: {
          orderNumber: new FieldMap({ segmentIdentifier: "OID", valuePosition: 1 }),
          productCode: new FieldMap({ segmentIdentifier: "OID", valuePosition: 2 }),
          quantity: new FieldMap({ segmentIdentifier: "OID", valuePosition: 4 }),
          quantityUOM: new FieldMap({ segmentIdentifier: "OID", valuePosition: 5 }),
          weight: new FieldMap({ segmentIdentifier: "OID", valuePosition: 7 }),
          weightUOM: new FieldMap({ segmentIdentifier: "OID", valuePosition: 8 }),
          commodityDescription: new FieldMap({ segmentIdentifier: "L5", valuePosition: 3 })
        }
      })
    }
  })
};

// ======================
// Parse EDI and Map JSON
// ======================
async function parseEDI() {
  const file = await readFile("test.edi", "utf8");

  const transaction = new Transaction();
  transaction.generateSegments(file);

  // Add loops
  transaction.addLoop(partyLoop);
  transaction.addLoop(stopLoop);
  transaction.addLoop(orderLoop);
  transaction.runLoops();

  // Map EDI to JSON
  const json = transaction.mapSegments(edi204MapLogic);

  console.log("Mapped JSON:", json);
  await writeFile("output.json", JSON.stringify(json, null, 2), "utf8");

  // Convert JSON back to EDI
  const edi = transaction.toX12(json, edi204MapLogic);
  console.log("Regenerated EDI:", edi);
}

parseEDI().catch(console.error);



