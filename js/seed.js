/**
 * Initial Seed Data for Firestore (Arabic Version)
 * Runs exactly once per database.
 */

async function checkAndSeedDatabase() {
    if (!window.fbDb) return;
    
    const db = window.fbDb;
    
    try {
        utils.showLoader();
        
        // 1. Check if already seeded
        const metaDoc = await db.collection('meta').doc('seeded').get();
        if (metaDoc.exists && metaDoc.data().done === true) {
            console.log("Database already seeded. Skipping seed.");
            utils.hideLoader();
            return;
        }
        
        console.log("Starting First-Launch Database Seeding (Arabic)...");

        // Start a batch write (we can do up to 500 operations in a batch)
        const batch = db.batch();

        // 2. SEED WAREHOUSES
        const wh1Ref = db.collection('warehouses').doc();
        batch.set(wh1Ref, {
            name: "المستودع الرئيسي",
            shortCode: "WH",
            address: "المنطقة الصناعية - مجمع أ",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const wh2Ref = db.collection('warehouses').doc();
        batch.set(wh2Ref, {
            name: "المستودع الثانوي",
            shortCode: "WH2",
            address: "المنطقة اللوجستية - مجمع ب",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. SEED LOCATIONS
        batch.set(db.collection('locations').doc(), {
            name: "منطقة التخزين 1", shortCode: "STK1", warehouseId: wh1Ref.id, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('locations').doc(), {
            name: "منطقة التخزين 2", shortCode: "STK2", warehouseId: wh1Ref.id, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('locations').doc(), {
            name: "رف الإنتاج", shortCode: "PROD", warehouseId: wh1Ref.id, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        batch.set(db.collection('locations').doc(), {
            name: "منطقة الاستلام والتجميع", shortCode: "STOR", warehouseId: wh2Ref.id, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 4. SEED COUNTERS (For auto-increment refs)
        batch.set(db.collection('counters').doc('receipts'), { count: 2 });
        batch.set(db.collection('counters').doc('deliveries'), { count: 2 });
        batch.set(db.collection('counters').doc('transfers'), { count: 1 });
        batch.set(db.collection('counters').doc('adjustments'), { count: 1 });

        // 5. SEED PRODUCTS
        const prodSteelRef = db.collection('products').doc();
        batch.set(prodSteelRef, { name: "قضبان حديد صلب", sku: "STL-001", category: "Raw Materials", uom: "kg", perUnitCost: 500, reorderLevel: 20, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        
        const prodChairRef = db.collection('products').doc();
        batch.set(prodChairRef, { name: "كراسي مكتبية مريحة", sku: "CHR-001", category: "Finished Goods", uom: "pcs", perUnitCost: 3000, reorderLevel: 5, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        
        const prodBoxRef = db.collection('products').doc();
        batch.set(prodBoxRef, { name: "صناديق كرتون شحن", sku: "BOX-001", category: "Packaging", uom: "box", perUnitCost: 50, reorderLevel: 50, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        
        const prodDeskRef = db.collection('products').doc();
        batch.set(prodDeskRef, { name: "مكاتب عمل خشبية", sku: "DESK001", category: "Finished Goods", uom: "pcs", perUnitCost: 3000, reorderLevel: 3, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

        // 6. SEED STOCK (Main Warehouse)
        batch.set(db.collection('stock').doc(), { productId: prodSteelRef.id, productName: "قضبان حديد صلب", warehouseId: wh1Ref.id, locationId: "", onHand: 100, freeToUse: 95, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(db.collection('stock').doc(), { productId: prodChairRef.id, productName: "كراسي مكتبية مريحة", warehouseId: wh1Ref.id, locationId: "", onHand: 30, freeToUse: 30, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(db.collection('stock').doc(), { productId: prodBoxRef.id, productName: "صناديق كرتون شحن", warehouseId: wh1Ref.id, locationId: "", onHand: 200, freeToUse: 200, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        batch.set(db.collection('stock').doc(), { productId: prodDeskRef.id, productName: "مكاتب عمل خشبية", warehouseId: wh1Ref.id, locationId: "", onHand: 50, freeToUse: 45, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

        // 7. SEED ONE DONE RECEIPT
        const recDate = new Date().toISOString().split('T')[0];
        const receiptRef = db.collection('receipts').doc();
        batch.set(receiptRef, {
            reference: "WH/IN/0001",
            receiveFrom: "شركة أكمي للتوريدات",
            scheduleDate: recDate,
            responsible: "مدير النظام",
            warehouseId: wh1Ref.id,
            status: "Done",
            lines: [{ productId: prodDeskRef.id, productLabel: "[DESK001] مكاتب عمل خشبية", quantity: 6 }],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            validatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 8. SEED ONE DONE DELIVERY
        const delRef = db.collection('deliveries').doc();
        batch.set(delRef, {
            reference: "WH/OUT/0001",
            deliveryAddress: "شركة بيلدكو للمقاولات",
            scheduleDate: recDate,
            responsible: "مدير النظام",
            operationType: "Delivery",
            warehouseId: wh1Ref.id,
            status: "Done",
            lines: [{ productId: prodChairRef.id, productLabel: "[CHR-001] كراسي مكتبية مريحة", quantity: 10 }],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            validatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 9. SEED LEDGER
        batch.set(db.collection('ledger').doc(), {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: "Receipt",
            reference: "WH/IN/0001",
            productId: prodDeskRef.id,
            productName: "مكاتب عمل خشبية",
            contact: "شركة أكمي للتوريدات",
            from: "شركة أكمي للتوريدات",
            to: "المستودع الرئيسي",
            quantity: 6,
            qtyChange: 6,
            status: "Done"
        });

        batch.set(db.collection('ledger').doc(), {
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: "Delivery",
            reference: "WH/OUT/0001",
            productId: prodChairRef.id,
            productName: "كراسي مكتبية مريحة",
            contact: "شركة بيلدكو للمقاولات",
            from: "المستودع الرئيسي",
            to: "شركة بيلدكو للمقاولات",
            quantity: 10,
            qtyChange: -10,
            status: "Done"
        });

        // 10. MARK AS SEEDED
        batch.set(db.collection('meta').doc('seeded'), { done: true });

        // Commit batch
        await batch.commit();
        console.log("Seeding complete!");
        utils.showToast("تم تهيئة البيانات الأولية بنجاح", "success");
        
    } catch (error) {
        console.error("Error during database seed: ", error);
        utils.showToast("حدث خطأ أثناء تهيئة البيانات الأولية", "error");
    } finally {
        utils.hideLoader();
    }
}

// Will be called by auth.js once user is logged in
window.seedController = { checkAndSeedDatabase };
