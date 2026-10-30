import { describe, it, expect } from 'vitest';
import {
  buildSettlePaymentDates,
  cashDateOrFilter,
  computeSettleAmounts,
  getPriorPayment,
  FULL_PAYOFF_MESSAGE,
  getSettleBlockReason,
  isLegacySentBack,
  LEGACY_SENT_BACK_MESSAGE,
  hasPriorPayment,
  requiresFullPayoff,
  isSamePaymentSnapshot,
  describeCashDates,
  drawerCashEntries,
  getCashDate,
  getReceiptPaymentDates,
  getVisitCashEvents,
  type CashDateVisit,
  isPaidOnAnotherDay,
  visitCashInRange,
} from './cash-date';

// Date and amount only; payment methods have their own tests below.
const events = (v: CashDateVisit) => getVisitCashEvents(v).map(({ date, amount }) => ({ date, amount }));

const umum = {
  tanggal_periksa: '2026-10-27',
  jenis_pasien: 'UMUM',
  biaya_periksa: 150000,
  pendapatan_lain: 50000,
};

describe('getCashDate', () => {
  it('falls back to the examination date for rows settled before F-021', () => {
    expect(getCashDate({ tanggal_periksa: '2026-09-02' })).toBe('2026-09-02');
    expect(getCashDate({ tanggal_periksa: '2026-09-02', tanggal_bayar: null })).toBe('2026-09-02');
  });

  it('uses the payment date when present', () => {
    expect(getCashDate({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-28' })).toBe('2026-10-28');
  });
});

describe('getVisitCashEvents', () => {
  it('books a same-day payment on the examination date (INV-021-1)', () => {
    expect(events({ ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-27' })).toEqual([
      { date: '2026-10-27', amount: 200000 },
    ]);
  });

  it('books a visit examined on D and paid on D+1 on D+1', () => {
    const v = { ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-28' };
    expect(events(v)).toEqual([{ date: '2026-10-28', amount: 200000 }]);
    expect(visitCashInRange(v, '2026-10-27', '2026-10-27')).toBe(0);
    expect(visitCashInRange(v, '2026-10-28', '2026-10-28')).toBe(200000);
    expect(isPaidOnAnotherDay(v)).toBe(true);
  });

  it('counts only the received part of an open Piutang', () => {
    const v = { ...umum, status_pembayaran: 'Piutang', tanggal_bayar: '2026-10-27', piutang_nominal: 120000 };
    expect(events(v)).toEqual([{ date: '2026-10-27', amount: 80000 }]);
  });

  it('splits a paid-off Piutang into first payment and payoff', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      piutang_nominal: 0,
    };
    expect(events(v)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 120000 },
    ]);
    expect(visitCashInRange(v, '2026-10-01', '2026-10-31')).toBe(200000);
  });

  it('merges a payoff made on the first payment day', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-27',
      nominal_pelunasan: 120000,
    };
    expect(events(v)).toEqual([{ date: '2026-10-27', amount: 200000 }]);
    expect(isPaidOnAnotherDay(v)).toBe(false);
  });

  it('brings in nothing for unpaid or cancelled visits', () => {
    expect(events({ ...umum, status_pembayaran: 'Belum Bayar' })).toEqual([]);
    expect(events({ ...umum, status_pembayaran: 'Batal' })).toEqual([]);
  });

  it('counts only extra charges for BPJS patients', () => {
    expect(
      events({ ...umum, jenis_pasien: 'BPJS', status_pembayaran: 'Lunas' })
    ).toEqual([{ date: '2026-10-27', amount: 50000 }]);
  });
});

describe('cashDateOrFilter', () => {
  it('matches examination, first payment, and payoff dates', () => {
    expect(cashDateOrFilter('2026-10-01', '2026-10-31')).toBe(
      'and(tanggal_periksa.gte.2026-10-01,tanggal_periksa.lte.2026-10-31),' +
        'and(tanggal_bayar.gte.2026-10-01,tanggal_bayar.lte.2026-10-31),' +
        'and(tanggal_pelunasan.gte.2026-10-01,tanggal_pelunasan.lte.2026-10-31)'
    );
  });
});

describe('buildSettlePaymentDates', () => {
  const waiting = {
    tanggal_periksa: '2026-10-27',
    status_pembayaran: 'Menunggu Pembayaran',
    jenis_pasien: 'UMUM',
    biaya_periksa: 150000,
    pendapatan_lain: 50000,
  };

  it('stamps today on a first settle as Lunas, Piutang, or free visit', () => {
    for (const status of ['Lunas', 'Piutang', 'Ditanggung BPJS']) {
      expect(
        buildSettlePaymentDates(waiting, { status, total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-28')
      ).toEqual({
        tanggal_bayar: '2026-10-28',
        tanggal_pelunasan: null,
        nominal_pelunasan: null,
        metode_pelunasan: null,
        jenis_pembayaran: 'Tunai',
      });
    }
  });

  it('writes nothing while the visit stays unpaid', () => {
    expect(
      buildSettlePaymentDates(waiting, { status: 'Belum Bayar', total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-28')
    ).toEqual({});
  });

  const piutang = {
    ...waiting,
    tanggal_bayar: '2026-10-27',
    status_pembayaran: 'Piutang',
    piutang_nominal: 120000,
    jenis_pembayaran: 'Tunai',
  };

  it('books a transfer payoff on its own day and keeps the cash first payment', () => {
    expect(
      buildSettlePaymentDates(piutang, { status: 'Lunas', total: 200000, outstanding: 0, method: 'TF' }, '2026-10-29')
    ).toEqual({
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      metode_pelunasan: 'TF',
    });
  });

  it('keeps the first payment date when a Piutang is settled again as Piutang', () => {
    const result = buildSettlePaymentDates(
      piutang,
      { status: 'Piutang', total: 200000, outstanding: 70000, method: 'Tunai' },
      '2026-10-29'
    );
    expect(result).toMatchObject({ tanggal_bayar: '2026-10-27', tanggal_pelunasan: '2026-10-29', nominal_pelunasan: 50000 });
  });

  it('keeps a paid visit sent back by the doctor on its payment day (C16)', () => {
    const resent = {
      ...waiting,
      status_pembayaran: 'Menunggu Kasir',
      payment_state: 'Lunas',
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      piutang_nominal: 0,
    };
    const result = buildSettlePaymentDates(
      resent,
      { status: 'Lunas', total: 200000, outstanding: 0, method: 'TF' },
      '2026-10-28'
    );
    expect(result).toEqual({
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      tanggal_pelunasan: null,
      nominal_pelunasan: null,
      metode_pelunasan: null,
    });
    const after = { ...resent, ...result, status_pembayaran: 'Lunas' };
    expect(events(after)).toEqual([{ date: '2026-10-27', amount: 200000 }]);
  });

  it('books an instalment on its own day and leaves the first day untouched (C3, C5, C18)', () => {
    const amounts = computeSettleAmounts(piutang, { status: 'Piutang', total: 200000, tendered: 50000 });
    expect(amounts).toMatchObject({ dueNow: 120000, paidNow: 50000, outstandingAfter: 70000, status: 'Piutang' });
    const result = buildSettlePaymentDates(
      piutang,
      { status: amounts.status, total: 200000, outstanding: amounts.outstandingAfter, method: 'Tunai' },
      '2026-10-28'
    );
    const after = { ...piutang, ...result, piutang_nominal: amounts.outstandingAfter };
    expect(events(after)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-28', amount: 50000 },
    ]);
  });

  it('books the money for a therapy package on the payoff day (C2)', () => {
    // handleApplyPackage raises piutang_nominal together with pendapatan_lain.
    const withPackage = { ...piutang, pendapatan_lain: 100000, piutang_nominal: 170000 };
    expect(events(withPackage)).toEqual([{ date: '2026-10-27', amount: 80000 }]);
    const amounts = computeSettleAmounts(withPackage, { status: 'Lunas', total: 250000, tendered: 170000 });
    expect(amounts).toMatchObject({ dueNow: 170000, paidNow: 170000, outstandingAfter: 0 });
    const result = buildSettlePaymentDates(
      withPackage,
      { status: 'Lunas', total: 250000, outstanding: 0, method: 'Tunai' },
      '2026-10-28'
    );
    const after = { ...withPackage, ...result, status_pembayaran: 'Lunas', piutang_nominal: 0 };
    expect(events(after)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-28', amount: 170000 },
    ]);
  });

  it('books charges added at the counter on the payoff day, not the first day', () => {
    const result = buildSettlePaymentDates(
      piutang,
      { status: 'Lunas', total: 220000, outstanding: 0, method: 'Tunai' },
      '2026-10-29'
    );
    expect(result.nominal_pelunasan).toBe(140000);
    const after = { ...piutang, ...result, status_pembayaran: 'Lunas', piutang_nominal: 0, pendapatan_lain: 70000 };
    expect(events(after)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 140000 },
    ]);
  });

  it('anchors a legacy Piutang without tanggal_bayar to the examination date', () => {
    const legacy = { ...piutang, tanggal_periksa: '2026-09-02', tanggal_bayar: null, piutang_nominal: '50000' };
    expect(
      buildSettlePaymentDates(legacy, { status: 'Lunas', total: 200000, outstanding: 0, method: 'Tunai' }, '2026-10-29')
    ).toMatchObject({ tanggal_bayar: '2026-09-02', tanggal_pelunasan: '2026-10-29', nominal_pelunasan: 50000 });
  });
});

describe('getVisitCashEvents payment methods', () => {
  it('keeps the first payment method and the payoff method apart', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Lunas',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-10-27',
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 120000,
      metode_pelunasan: 'TF',
    };
    expect(getVisitCashEvents(v)).toEqual([
      { date: '2026-10-27', amount: 80000, method: 'Tunai' },
      { date: '2026-10-29', amount: 120000, method: 'TF' },
    ]);
  });

  it('counts only received money for a Piutang that already had an instalment', () => {
    const v = {
      ...umum,
      status_pembayaran: 'Piutang',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-10-27',
      piutang_nominal: 70000,
      tanggal_pelunasan: '2026-10-29',
      nominal_pelunasan: 50000,
    };
    expect(events(v)).toEqual([
      { date: '2026-10-27', amount: 80000 },
      { date: '2026-10-29', amount: 50000 },
    ]);
  });
});

describe('describeCashDates', () => {
  it('shows the cash date, the open balance, and the payoff date', () => {
    expect(describeCashDates({ ...umum, status_pembayaran: 'Lunas' })).toBe('2026-10-27');
    expect(describeCashDates({ ...umum, status_pembayaran: 'Lunas', tanggal_bayar: '2026-10-28' })).toBe(
      '2026-10-28'
    );
    expect(
      describeCashDates({ ...umum, status_pembayaran: 'Piutang', tanggal_bayar: '2026-10-27', piutang_nominal: 1 })
    ).toBe('2026-10-27, sisa piutang');
    expect(
      describeCashDates({
        ...umum,
        status_pembayaran: 'Lunas',
        tanggal_bayar: '2026-10-27',
        tanggal_pelunasan: '2026-10-29',
        nominal_pelunasan: 120000,
      })
    ).toBe('2026-10-27, lunas 2026-10-29');
  });

  it('shows a dash for a visit that is not paid yet', () => {
    expect(describeCashDates({ ...umum, status_pembayaran: 'Belum Bayar' })).toBe('-');
  });
});

describe('getReceiptPaymentDates', () => {
  it('returns nothing when the visit was paid on its examination day', () => {
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27' })).toBeNull();
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-27' })).toBeNull();
  });

  it('returns the payment and payoff dates when they differ', () => {
    expect(getReceiptPaymentDates({ tanggal_periksa: '2026-10-27', tanggal_bayar: '2026-10-28' })).toEqual({
      tanggalBayar: '2026-10-28',
      tanggalPelunasan: null,
    });
    expect(
      getReceiptPaymentDates({
        tanggal_periksa: '2026-10-27',
        tanggal_bayar: '2026-10-27',
        tanggal_pelunasan: '2026-10-29',
      })
    ).toEqual({ tanggalBayar: '2026-10-27', tanggalPelunasan: '2026-10-29' });
  });
});

describe('drawerCashEntries', () => {
  const visits = [
    { ...umum, id: 'a', status_pembayaran: 'Lunas', jenis_pembayaran: 'Tunai' },
    { ...umum, id: 'b', status_pembayaran: 'Lunas', jenis_pembayaran: 'TF' },
    { ...umum, id: 'c', status_pembayaran: 'Belum Bayar', jenis_pembayaran: 'Tunai' },
    {
      ...umum,
      id: 'd',
      tanggal_periksa: '2026-09-30',
      status_pembayaran: 'Lunas',
      jenis_pembayaran: 'Tunai',
      tanggal_bayar: '2026-09-30',
      tanggal_pelunasan: '2026-10-02',
      nominal_pelunasan: 120000,
    },
  ];

  it('keeps cash-paid money received inside the range, per day received', () => {
    expect(drawerCashEntries(visits, '2026-10-01', '2026-10-31')).toEqual([
      { visitId: 'a', date: '2026-10-27', amount: 200000 },
      { visitId: 'd', date: '2026-10-02', amount: 120000 },
    ]);
  });

  it('leaves the payoff out of the month it was not received in', () => {
    expect(drawerCashEntries(visits, '2026-09-01', '2026-09-30')).toEqual([
      { visitId: 'd', date: '2026-09-30', amount: 80000 },
    ]);
  });
});

describe('getPriorPayment', () => {
  it('finds no prior payment on a visit that never reached the cashier', () => {
    expect(getPriorPayment({ ...umum, status_pembayaran: 'Menunggu Kasir' })).toBeNull();
    expect(hasPriorPayment({ ...umum, status_pembayaran: 'Menunggu Pembayaran' })).toBe(false);
  });

  it('reads the paid part and balance of an open Piutang', () => {
    expect(
      getPriorPayment({
        ...umum,
        status_pembayaran: 'Piutang',
        tanggal_bayar: '2026-10-27',
        piutang_nominal: 120000,
        jenis_pembayaran: 'Tunai',
      })
    ).toEqual({
      paid: 80000,
      outstanding: 120000,
      billedTotal: 200000,
      firstDate: '2026-10-27',
      firstMethod: 'Tunai',
      payoffDate: null,
    });
  });

  it('recognises a paid visit the doctor sent back to the cashier', () => {
    const viaDate = { ...umum, status_pembayaran: 'Menunggu Kasir', tanggal_bayar: '2026-10-27' };
    expect(getPriorPayment(viaDate)).toMatchObject({ paid: 200000, outstanding: 0 });
    const legacy = { ...umum, status_pembayaran: 'Menunggu Kasir', payment_state: 'Piutang', piutang_nominal: 50000 };
    expect(getPriorPayment(legacy)).toMatchObject({ paid: 150000, outstanding: 50000, firstDate: '2026-10-27' });
  });

  it('treats a Piutang with nothing paid yet as owed money', () => {
    expect(
      getPriorPayment({ ...umum, status_pembayaran: 'Piutang', tanggal_bayar: '2026-10-27', piutang_nominal: 200000 })
    ).toMatchObject({ paid: 0, outstanding: 200000 });
  });

  it('ignores cancelled, free, and BPJS-covered visits', () => {
    expect(getPriorPayment({ ...umum, status_pembayaran: 'Batal', tanggal_bayar: '2026-10-27' })).toBeNull();
    expect(
      getPriorPayment({
        ...umum,
        biaya_periksa: 0,
        pendapatan_lain: 0,
        status_pembayaran: 'Lunas',
        tanggal_bayar: '2026-10-27',
      })
    ).toBeNull();
    expect(
      hasPriorPayment({
        ...umum,
        jenis_pasien: 'BPJS',
        pendapatan_lain: 0,
        status_pembayaran: 'Menunggu Kasir',
        payment_state: 'Ditanggung BPJS',
        tanggal_bayar: '2026-10-27',
      })
    ).toBe(false);
  });

  it('does not trust a balance the old Belum Bayar path already cleared', () => {
    expect(
      getPriorPayment({
        ...umum,
        status_pembayaran: 'Belum Bayar',
        payment_state: 'Belum Bayar',
        tanggal_bayar: '2026-10-27',
        piutang_nominal: 0,
      })
    ).toBeNull();
  });
});

describe('computeSettleAmounts', () => {
  const fresh = { ...umum, status_pembayaran: 'Menunggu Kasir' };
  const piutang = {
    ...umum,
    status_pembayaran: 'Piutang',
    tanggal_bayar: '2026-10-27',
    piutang_nominal: 120000,
    jenis_pembayaran: 'Tunai',
  };

  it('charges the full bill on a first payment', () => {
    expect(computeSettleAmounts(fresh, { status: 'Lunas', total: 200000, tendered: 250000 })).toEqual({
      dueNow: 200000,
      paidNow: 200000,
      outstandingAfter: 0,
      change: 50000,
      isShort: false,
      overpaid: 0,
      status: 'Lunas',
    });
  });

  it('flags a Lunas that does not cover the amount due now', () => {
    expect(computeSettleAmounts(piutang, { status: 'Lunas', total: 200000, tendered: 100000 }).isShort).toBe(true);
    expect(computeSettleAmounts(piutang, { status: 'Lunas', total: 200000, tendered: 120000 }).isShort).toBe(false);
  });

  it('adds charges made at the counter to the remaining balance', () => {
    expect(computeSettleAmounts(piutang, { status: 'Piutang', total: 220000, tendered: 40000 })).toMatchObject({
      dueNow: 140000,
      paidNow: 40000,
      outstandingAfter: 100000,
      status: 'Piutang',
    });
  });

  it('turns a Piutang that is paid in full into Lunas', () => {
    expect(computeSettleAmounts(piutang, { status: 'Piutang', total: 200000, tendered: 120000 })).toMatchObject({
      paidNow: 120000,
      outstandingAfter: 0,
      status: 'Lunas',
    });
  });

  it('reports a bill that fell below the money already received', () => {
    const lunas = { ...umum, status_pembayaran: 'Menunggu Kasir', tanggal_bayar: '2026-10-27' };
    expect(computeSettleAmounts(lunas, { status: 'Lunas', total: 150000, tendered: 0 })).toMatchObject({
      dueNow: 0,
      overpaid: 50000,
    });
  });

  it('moves no money while the visit stays unpaid', () => {
    expect(computeSettleAmounts(fresh, { status: 'Belum Bayar', total: 200000, tendered: 200000 })).toMatchObject({
      paidNow: 0,
      outstandingAfter: 0,
      status: 'Belum Bayar',
    });
  });
});

describe('zero-paid visits reopened by the doctor', () => {
  it('charges a Ditanggung BPJS visit for a new charge and books it today', () => {
    const covered = {
      tanggal_periksa: '2026-10-27',
      jenis_pasien: 'BPJS',
      biaya_periksa: 0,
      pendapatan_lain: 50000,
      status_pembayaran: 'Menunggu Kasir',
      payment_state: 'Ditanggung BPJS',
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      piutang_nominal: 0,
    };
    expect(getPriorPayment(covered)).toBeNull();
    const amounts = computeSettleAmounts(covered, { status: 'Lunas', total: 50000, tendered: 50000 });
    expect(amounts).toMatchObject({ dueNow: 50000, paidNow: 50000, overpaid: 0 });
    const result = buildSettlePaymentDates(
      covered,
      { status: 'Lunas', total: 50000, outstanding: 0, method: 'Tunai' },
      '2026-10-28'
    );
    expect(result).toMatchObject({ tanggal_bayar: '2026-10-28', tanggal_pelunasan: null, nominal_pelunasan: null });
    expect(events({ ...covered, ...result, status_pembayaran: 'Lunas' })).toEqual([{ date: '2026-10-28', amount: 50000 }]);
  });

  it('charges a free visit for a new charge instead of reading it as paid', () => {
    const free = {
      ...umum,
      biaya_periksa: 50000,
      pendapatan_lain: 0,
      status_pembayaran: 'Menunggu Kasir',
      payment_state: 'Lunas',
      is_gratis: true,
      tanggal_bayar: '2026-10-27',
      piutang_nominal: 0,
    };
    expect(getPriorPayment(free)).toBeNull();
    expect(computeSettleAmounts(free, { status: 'Lunas', total: 50000, tendered: 50000 }).dueNow).toBe(50000);
  });

  it('starts a fresh first payment on a settled Piutang that took nothing yet', () => {
    const unpaid = {
      ...umum,
      status_pembayaran: 'Piutang',
      tanggal_bayar: '2026-10-27',
      jenis_pembayaran: 'Tunai',
      piutang_nominal: 200000,
    };
    expect(requiresFullPayoff(unpaid)).toBe(false);
    const amounts = computeSettleAmounts(unpaid, { status: 'Piutang', total: 200000, tendered: 50000 });
    expect(
      getSettleBlockReason(unpaid, { status: amounts.status, paidNow: amounts.paidNow, method: 'TF' }, '2026-10-29')
    ).toBeNull();
    const result = buildSettlePaymentDates(
      unpaid,
      { status: amounts.status, total: 200000, outstanding: amounts.outstandingAfter, method: 'TF' },
      '2026-10-29'
    );
    expect(result).toEqual({
      tanggal_bayar: '2026-10-29',
      tanggal_pelunasan: null,
      nominal_pelunasan: null,
      metode_pelunasan: null,
      jenis_pembayaran: 'TF',
    });
    const after = { ...unpaid, ...result, piutang_nominal: amounts.outstandingAfter };
    expect(getVisitCashEvents(after)).toEqual([{ date: '2026-10-29', amount: 50000, method: 'TF' }]);
  });
});

describe('one payoff record per visit (DEC-021-2, DEC-021-3)', () => {
  const firstPartial = {
    ...umum,
    status_pembayaran: 'Piutang',
    tanggal_bayar: '2026-10-01',
    jenis_pembayaran: 'Tunai',
    piutang_nominal: 120000,
  };

  it('pays off on day 3 by transfer and leaves day 1 with its amount and method', () => {
    const amounts = computeSettleAmounts(firstPartial, { status: 'Lunas', total: 200000, tendered: 120000 });
    expect(
      getSettleBlockReason(firstPartial, { status: amounts.status, paidNow: amounts.paidNow, method: 'TF' }, '2026-10-03')
    ).toBeNull();
    const result = buildSettlePaymentDates(
      firstPartial,
      { status: 'Lunas', total: 200000, outstanding: 0, method: 'TF' },
      '2026-10-03'
    );
    const after = { ...firstPartial, ...result, status_pembayaran: 'Lunas', piutang_nominal: 0 };
    expect(getVisitCashEvents(after)).toEqual([
      { date: '2026-10-01', amount: 80000, method: 'Tunai' },
      { date: '2026-10-03', amount: 120000, method: 'TF' },
    ]);
  });

  it('rejects a second partial payment after a first partial one', () => {
    expect(requiresFullPayoff(firstPartial)).toBe(true);
    const amounts = computeSettleAmounts(firstPartial, { status: 'Piutang', total: 200000, tendered: 50000 });
    expect(amounts.status).toBe('Piutang');
    expect(
      getSettleBlockReason(firstPartial, { status: amounts.status, paidNow: amounts.paidNow, method: 'Tunai' }, '2026-10-02')
    ).toBe(FULL_PAYOFF_MESSAGE);
  });

  // Paid off in cash on day 3, then the doctor added Rp 20.000 on the same day.
  const reopened = {
    ...umum,
    pendapatan_lain: 70000,
    status_pembayaran: 'Piutang',
    tanggal_bayar: '2026-10-01',
    jenis_pembayaran: 'Tunai',
    piutang_nominal: 20000,
    tanggal_pelunasan: '2026-10-03',
    nominal_pelunasan: 120000,
    metode_pelunasan: 'Tunai',
  };

  it('rejects a same-day second receipt with a different method', () => {
    const reason = getSettleBlockReason(reopened, { status: 'Lunas', paidNow: 20000, method: 'TF' }, '2026-10-03');
    expect(reason).toContain('Tunai');
    expect(reason).toContain('satu pembayaran lanjutan per kunjungan');
  });

  it('merges a same-day second receipt with the same method into the payoff', () => {
    expect(getSettleBlockReason(reopened, { status: 'Lunas', paidNow: 20000, method: 'Tunai' }, '2026-10-03')).toBeNull();
    const result = buildSettlePaymentDates(
      reopened,
      { status: 'Lunas', total: 220000, outstanding: 0, method: 'Tunai' },
      '2026-10-03'
    );
    expect(result).toMatchObject({ tanggal_pelunasan: '2026-10-03', nominal_pelunasan: 140000, metode_pelunasan: 'Tunai' });
    const after = { ...reopened, ...result, status_pembayaran: 'Lunas', piutang_nominal: 0 };
    expect(getVisitCashEvents(after)).toEqual([
      { date: '2026-10-01', amount: 80000, method: 'Tunai' },
      { date: '2026-10-03', amount: 140000, method: 'Tunai' },
    ]);
  });

  it('refuses a receipt that would move a payoff booked on an earlier day (C17)', () => {
    const instalment = {
      ...firstPartial,
      piutang_nominal: 70000,
      tanggal_pelunasan: '2026-10-02',
      nominal_pelunasan: 50000,
      metode_pelunasan: 'Tunai',
    };
    for (const method of ['TF', 'Tunai']) {
      const reason = getSettleBlockReason(instalment, { status: 'Lunas', paidNow: 70000, method }, '2026-10-05');
      expect(reason).toContain('sudah tercatat pada');
      expect(reason).toContain('satu pembayaran lanjutan per kunjungan');
    }
    expect(getVisitCashEvents(instalment)).toEqual([
      { date: '2026-10-01', amount: 80000, method: 'Tunai' },
      { date: '2026-10-02', amount: 50000, method: 'Tunai' },
    ]);
  });

  it('lets a paid visit sent back without a new charge finish on any day', () => {
    const resent = {
      ...reopened,
      pendapatan_lain: 50000,
      piutang_nominal: 0,
      status_pembayaran: 'Menunggu Kasir',
      payment_state: 'Lunas',
    };
    expect(getSettleBlockReason(resent, { status: 'Lunas', paidNow: 0, method: 'TF' }, '2026-10-09')).toBeNull();
  });
});

describe('isSamePaymentSnapshot', () => {
  const base = { ...umum, status_pembayaran: 'Piutang', piutang_nominal: 120000, tanggal_bayar: '2026-10-27' };

  it('ignores numeric strings versus numbers from PostgREST', () => {
    expect(isSamePaymentSnapshot(base, { ...base, piutang_nominal: '120000.00', biaya_periksa: '150000' })).toBe(true);
  });

  it('detects a payment or bill change made elsewhere', () => {
    expect(isSamePaymentSnapshot(base, { ...base, piutang_nominal: 70000 })).toBe(false);
    expect(isSamePaymentSnapshot(base, { ...base, status_pembayaran: 'Lunas' })).toBe(false);
    expect(isSamePaymentSnapshot(base, { ...base, pendapatan_lain: 90000 })).toBe(false);
    expect(isSamePaymentSnapshot(base, { ...base, tanggal_pelunasan: '2026-10-28' })).toBe(false);
  });
});

describe('legacy sent-back rows and cancel guard', () => {
  const legacy = {
    tanggal_periksa: '2026-10-20',
    status_pembayaran: 'Menunggu Kasir',
    payment_state: 'Lunas',
    jenis_pasien: 'UMUM',
    biaya_periksa: 130000,
    pendapatan_lain: 0,
    piutang_nominal: 0,
  };

  it('flags a paid row the earlier examination form sent back without a payment date', () => {
    expect(isLegacySentBack(legacy)).toBe(true);
    expect(getSettleBlockReason(legacy, { status: 'Lunas', paidNow: 0, method: 'Tunai' }, '2026-10-30')).toBe(
      LEGACY_SENT_BACK_MESSAGE
    );
  });

  it('does not flag rows with a payment date or rows that are settled', () => {
    expect(isLegacySentBack({ ...legacy, tanggal_bayar: '2026-10-20' })).toBe(false);
    expect(isLegacySentBack({ ...legacy, status_pembayaran: 'Lunas' })).toBe(false);
    expect(isLegacySentBack({ ...legacy, payment_state: 'Menunggu Pembayaran' })).toBe(false);
  });

  it('lets a Piutang that received no money be cancelled', () => {
    const zeroPaid = {
      tanggal_periksa: '2026-10-29',
      tanggal_bayar: '2026-10-29',
      status_pembayaran: 'Piutang',
      jenis_pasien: 'UMUM',
      biaya_periksa: 100000,
      pendapatan_lain: 0,
      piutang_nominal: 100000,
    };
    expect(requiresFullPayoff(zeroPaid)).toBe(false);
    expect(requiresFullPayoff({ ...zeroPaid, piutang_nominal: 60000 })).toBe(true);
  });
});
