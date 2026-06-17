/**
 * Menghitung jadwal produksi menggunakan algoritma Pipeline Flow Shop.
 * Sesuai dengan spesifikasi: .trae/specs/ai-scheduler-algorithm/spec.md
 *
 * @param {number} totalPortions - Total porsi yang akan diproduksi.
 * @param {string|Date} startTime - Waktu mulai produksi.
 * @param {string|Date} targetDeliveryTime - Target waktu pengiriman.
 * @param {Object} rates - Kecepatan produksi per divisi (porsi/jam).
 * @param {number} rates.prep - Rate divisi Preparation.
 * @param {number} rates.cook - Rate divisi Cooking.
 * @param {number} rates.pack - Rate divisi Packaging.
 * @param {Object} options - Opsi tambahan (opsional).
 * @param {number} [options.targetBatchDuration=60] - Durasi batch ideal dalam menit (default 60).
 * @param {number} [options.bufferPercent=10] - Buffer waktu dalam persen (default 10%).
 * @param {number} [options.cookingTime=null] - Waktu masak spesifik (menit) untuk menu ini. Jika ada, menimpa kalkulasi rate.
 * @param {number} [options.batchCapacity=null] - Kapasitas batch spesifik (porsi) untuk menu ini. Jika ada, menimpa kalkulasi rate.
 * 
 * @returns {Object} Hasil penjadwalan { batches, feasibility, summary }.
 */
function calculateSchedule(totalPortions, startTime, targetDeliveryTime, rates, options = {}) {
    // 1. Setup & Default Values
    const start = new Date(startTime);
    const delivery = new Date(targetDeliveryTime);
    const targetBatchDurationMinutes = options.targetBatchDuration || 60;
    const bufferPercent = (options.bufferPercent || 10) / 100;

    // Validasi input sederhana
    if (!rates || !rates.prep || !rates.cook || !rates.pack) {
        throw new Error("Rates untuk prep, cook, dan pack harus didefinisikan.");
    }

    // 2. Penentuan Bottleneck & Batch Size
    // R_min = min(Rate_prep, Rate_cook, Rate_pack)
    const minRate = Math.min(rates.prep, rates.cook, rates.pack);
    
    // B_ideal: Jika ada batchCapacity spesifik, gunakan itu.
    // Jika tidak, hitung dari R_min * T_batch
    let idealBatchSize;
    if (options.batchCapacity && options.batchCapacity > 0) {
        idealBatchSize = options.batchCapacity;
    } else {
        idealBatchSize = minRate * (targetBatchDurationMinutes / 60);
    }
    
    // N_batch = ceil(Total / B_ideal)
    // Pastikan minimal 1 batch
    const batchCount = Math.max(1, Math.ceil(totalPortions / idealBatchSize));
    
    // B_actual = Total / N_batch (atau tetap gunakan batchCapacity jika strict?)
    // Biasanya batch terakhir lebih kecil.
    // Tapi untuk simplifikasi durasi, kita anggap rata-rata.
    // Namun jika batchCapacity ditentukan, kita mungkin ingin memaksimalkan setiap batch.
    // Di sini kita tetap pakai rata-rata agar load seimbang, kecuali user minta strict batching.
    // Sesuai prompt "tambahkan juga cooking time itu dengan kapasitas batch berapa",
    // asumsinya adalah 1 batch = X porsi, memakan waktu Y menit.
    
    // Jika batchCapacity ditentukan, kita gunakan logic fixed size batches + remainder?
    // Atau tetap dynamic balancing?
    // Untuk flow shop, balancing lebih efisien.
    // Mari kita tetap balance tapi dengan ceiling idealBatchSize dari input user.
    
    const actualBatchSize = Math.ceil(totalPortions / batchCount);

    // 3. Durasi Divisi (D_k) dalam milidetik
    // D_k = (B_actual / Rate_k) * (1 + Buffer) * 3600000 (jam ke ms)
    const durationPrep = (actualBatchSize / rates.prep) * (1 + bufferPercent) * 3600000;
    
    // Logic Cooking Time Dinamis
    let durationCook;
    if (options.cookingTime && options.cookingTime > 0) {
        // Jika ada cookingTime spesifik, gunakan itu + buffer
        // cookingTime input dalam menit, ubah ke ms
        // Asumsi: cookingTime adalah durasi untuk 1 batch (dengan size batchCapacity).
        // Jika actualBatchSize lebih kecil, apakah lebih cepat?
        // Biasanya masak (heating) itu fixed time per batch tidak peduli isinya penuh/setengah.
        // Jadi kita gunakan fixed cookingTime.
        durationCook = (options.cookingTime * 60000) * (1 + bufferPercent);
    } else {
        // Fallback ke rate capacity
        durationCook = (actualBatchSize / rates.cook) * (1 + bufferPercent) * 3600000;
    }

    const durationPack = (actualBatchSize / rates.pack) * (1 + bufferPercent) * 3600000;

    const durations = [durationPrep, durationCook, durationPack];
    const stages = ['prep', 'cook', 'pack'];

    // 4. Penjadwalan (Forward Scheduling)
    const batches = [];
    
    // Matrix untuk menyimpan waktu selesai [batchIndex][stageIndex]
    // batchIndex: 0..N-1, stageIndex: 0 (prep), 1 (cook), 2 (pack)
    const finishTimes = Array(batchCount).fill(null).map(() => Array(3).fill(0));

    for (let i = 0; i < batchCount; i++) {
        const batchSchedule = {
            id: i + 1,
            size: actualBatchSize,
            stages: {}
        };

        for (let k = 0; k < 3; k++) {
            let startTimeMs;

            // Logika Pipeline:
            // Start(i, k) = max(Finish(i, k-1), Finish(i-1, k))
            
            // Finish(i, k-1): Kapan batch INI selesai di stage SEBELUMNYA
            const prevStageFinish = (k === 0) ? start.getTime() : finishTimes[i][k - 1];
            
            // Finish(i-1, k): Kapan batch SEBELUMNYA selesai di stage INI
            const prevBatchFinish = (i === 0) ? start.getTime() : finishTimes[i - 1][k];

            startTimeMs = Math.max(prevStageFinish, prevBatchFinish);
            
            const endTimeMs = startTimeMs + durations[k];
            
            // Simpan waktu selesai untuk referensi iterasi berikutnya
            finishTimes[i][k] = endTimeMs;

            batchSchedule.stages[stages[k]] = {
                start: new Date(startTimeMs).toISOString(),
                end: new Date(endTimeMs).toISOString(),
                durationMinutes: Math.round(durations[k] / 60000)
            };
        }
        
        // Waktu mulai batch (start of prep) dan selesai batch (end of pack)
        batchSchedule.startTime = batchSchedule.stages.prep.start;
        batchSchedule.endTime = batchSchedule.stages.pack.end;
        
        batches.push(batchSchedule);
    }

    // 5. Feasibility Check
    const lastBatchEnd = new Date(finishTimes[batchCount - 1][2]);
    const isFeasible = lastBatchEnd.getTime() <= delivery.getTime();
    const latenessMinutes = isFeasible ? 0 : Math.ceil((lastBatchEnd.getTime() - delivery.getTime()) / 60000);

    return {
        feasible: isFeasible,
        totalBatches: batchCount,
        batchSize: actualBatchSize,
        productionStart: start.toISOString(),
        productionEnd: lastBatchEnd.toISOString(),
        deliveryTarget: delivery.toISOString(),
        latenessMinutes: latenessMinutes,
        bottleneckRate: minRate,
        batches: batches
    };
}

module.exports = { calculateSchedule };
