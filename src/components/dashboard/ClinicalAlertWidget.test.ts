import { describe, expect, it } from 'vitest';
import { countPostCareAlerts } from './ClinicalAlertWidget';

const today = '2026-10-30';

describe('countPostCareAlerts', () => {
  it('counts a Mangkir agenda dated today or later as overdue only, like Program Khusus', () => {
    const result = countPostCareAlerts(
      [
        { status_kontrol: 'Mangkir', tanggal_kontrol_berikutnya: '2026-11-02' },
        { status_kontrol: 'Mangkir', tanggal_kontrol_berikutnya: today },
      ],
      today
    );
    expect(result).toEqual({ todayPostCare: 0, overduePostCare: 2 });
  });

  it('counts waiting agendas by date', () => {
    const result = countPostCareAlerts(
      [
        { status_kontrol: 'Menunggu', tanggal_kontrol_berikutnya: '2026-10-29' },
        { status_kontrol: 'Menunggu', tanggal_kontrol_berikutnya: today },
        { status_kontrol: 'Menunggu', tanggal_kontrol_berikutnya: '2026-10-31' },
      ],
      today
    );
    expect(result).toEqual({ todayPostCare: 1, overduePostCare: 1 });
  });

  it('ignores finished agendas', () => {
    const result = countPostCareAlerts(
      [
        { status_kontrol: 'Sudah Kontrol', tanggal_kontrol_berikutnya: '2026-10-01' },
        { status_kontrol: 'Sudah Kontrol', tanggal_kontrol_berikutnya: today },
      ],
      today
    );
    expect(result).toEqual({ todayPostCare: 0, overduePostCare: 0 });
  });
});
