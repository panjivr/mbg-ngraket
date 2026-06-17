(() => {
    const ROLE_DICTIONARY = {
        kepala_sppg: {
            label: 'Kepala SPPG',
            scope: 'operational_lead',
            allowed_nav: ['dashboard', 'production', 'kitchen', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'purchases', 'finance', 'performance', 'staff', 'nutrisurvey', 'pricing', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'operational-materials']
        },
        asisten_lapangan: {
            label: 'Asisten Lapangan',
            scope: 'field_ops',
            allowed_nav: ['dashboard', 'production', 'kitchen', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'purchases', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'absensi-saya', 'operational-materials']
        },
        ahli_gizi: {
            label: 'Ahli Gizi',
            scope: 'nutrition_quality',
            allowed_nav: ['nutrisurvey', 'recipes', 'workflows', 'menu', 'ingredient', 'inventory', 'reports']
        },
        akuntan: {
            label: 'Akuntan',
            scope: 'finance',
            allowed_nav: ['dashboard', 'inventory', 'purchases', 'finance', 'pricing', 'reports', 'operational-materials']
        },
        yayasan: {
            label: 'Yayasan',
            scope: 'oversight',
            allowed_nav: ['dashboard', 'inventory', 'finance', 'performance', 'reports', 'penerima-manfaat', 'distribusi']
        },
        admin: {
            label: 'Admin',
            scope: 'administration',
            allowed_nav: ['dashboard', 'staff', 'jobdesc', 'reports', 'penerima-manfaat', 'distribusi', 'absensi-saya']
        },
        koordinator_divisi: {
            label: 'Koordinator Divisi',
            scope: 'division_supervisor',
            allowed_nav: ['dashboard', 'tasks', 'inventory', 'reports']
        },
        driver: {
            label: 'Driver',
            scope: 'distribution_driver',
            allowed_nav: ['routes', 'tasks']
        }
    };

    const KPI_DICTIONARY = {
        on_time_distribution_rate: {
            label: 'Ketepatan Waktu Distribusi',
            unit: 'ratio',
            formula: 'on_time_deliveries / total_deliveries'
        },
        beneficiary_coverage_rate: {
            label: 'Cakupan Penerima Manfaat',
            unit: 'ratio',
            formula: 'served_portions / target_portions'
        },
        sppg_sop_compliance_rate: {
            label: 'Kepatuhan SOP Produksi',
            unit: 'ratio',
            formula: 'completed_tasks / total_tasks'
        },
        food_safety_compliance_rate: {
            label: 'Kepatuhan Keamanan Pangan',
            unit: 'ratio',
            formula: 'safe_batches / checked_batches'
        },
        service_quality_score: {
            label: 'Skor Kualitas Layanan',
            unit: 'score',
            formula: 'weighted average of quality checks'
        },
        coordination_effectiveness_score: {
            label: 'Skor Efektivitas Koordinasi',
            unit: 'score',
            formula: 'issue_resolution_per_period'
        }
    };

    const ROLE_ALIAS = {
        koordinator: 'koordinator_divisi'
    };

    window.MBG_CANONICAL = {
        version: '2025.401.1',
        source: 'Keputusan Kepala BGN 401.1/2025',
        roles: ROLE_DICTIONARY,
        roleAlias: ROLE_ALIAS,
        kpis: KPI_DICTIONARY
    };
})();
