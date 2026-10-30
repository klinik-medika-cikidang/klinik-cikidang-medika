"""User handbook for the clinic system, with screenshots for the daily flows that matter most.

Writes docs/product/Buku_Panduan_SIM_Klinik_Cikidang_Medika.pdf and a copy in the user's Downloads folder.
Screenshots come from the staging test of 2026-10-30 and show fictitious patients only.
Run from the repository root: python scripts/generate_handbook_pdf.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Spacer

from clinic_pdf_kit import S, boxed, build, bullets, figure, h2, info_grid, steps, table

ASSETS = os.path.join("docs", "documentation", "assets", "2026-10-30")
FILE_NAME = "Buku_Panduan_SIM_Klinik_Cikidang_Medika.pdf"
OUT_PATH = os.path.join("docs", "product", FILE_NAME)
DOWNLOADS = os.path.join(os.path.expanduser("~"), "Downloads", FILE_NAME)
TITLE = "Buku Panduan Penggunaan SIM Klinik"
RUNNING = "Buku Panduan Penggunaan SIM Klinik Pratama Cikidang Medika"


def img(name):
    return os.path.join(ASSETS, name)


def body(text):
    return Paragraph(text, S["body"])


def h3(text):
    return Paragraph(text, S["h3"])


def story():
    s = []
    s.append(Paragraph(TITLE, S["title"]))
    s.append(Paragraph("Sistem Informasi Manajemen Klinik Pratama Cikidang Medika • Pendaftaran, Rekam Medis, Kasir, dan Keuangan", S["subtitle"]))
    s.append(info_grid([
        ["<b>Untuk:</b> pimpinan klinik, dokter, dan petugas loket/kasir", "<b>Versi panduan:</b> 30 Oktober 2026"],
        ["<b>Cara membuka:</b> alamat web sistem melalui Google Chrome di komputer, tablet, atau HP", "<b>Contoh gambar:</b> pasien fiktif dari sistem uji; nama pasien sungguhan disamarkan"],
    ]))
    s.append(Spacer(1, 5))
    s.append(boxed(
        "Panduan ini sudah memuat pembaruan Oktober 2026 (tunggakan kasir, tanggal bayar dan pelunasan piutang, Saldo Awal laci, "
        "rekap pengeluaran Klinik/Non Klinik, dan tampilan Pasien Aktif). Fitur tersebut dapat dipakai setelah pembaruan diterapkan ke sistem utama."
    ))

    s += h2("1. Menu dan Hak Akses")
    s.append(body("Setiap akun hanya dapat membuka menu sesuai perannya. Pembatasan ini dijalankan oleh sistem, bukan sekadar menyembunyikan tombol."))
    s.append(table(
        ["Menu", "Fungsi", "Pemilik", "Dokter/Admin"],
        [
            ["Dashboard Ringkasan", "Ringkasan kunjungan, pendapatan, pengeluaran, dan kas", "Ya", "Tidak"],
            ["Loket &amp; Kasir", "Cari dan daftarkan pasien, antrean, pembayaran, kuitansi", "Ya", "Ya"],
            ["Pemeriksaan Dokter", "Tanda vital, anamnesa, diagnosa ICD-10, resep, tindakan", "Ya", "Ya (halaman awal setelah masuk)"],
            ["Program Khusus Medis", "Kartu kendali TBC, sirkumsisi dan foto, agenda observasi, program kesehatan", "Ya", "Ya"],
            ["Paket Terapi", "Mengatur paket tindakan dan obat", "Ya", "Tidak"],
            ["Buku Kas Operasional", "Kas masuk, kas keluar, setoran, sisa laci", "Ya, semua bulan", "Ya, mutasi hari ini saja, tanpa angka khusus pemilik"],
            ["Laporan &amp; Ekspor Excel", "Rekap kunjungan, penyakit, rujukan bidan, Puskesmas, arus kas", "Ya", "Ya, tanpa ringkasan angka keuangan"],
        ],
        [3.6 * cm, 7.0 * cm, 2.6 * cm, 4.6 * cm],
    ))
    s.append(Spacer(1, 4))
    s.append(body(
        "Akun Pemilik: <b>owner@cikidangmedika.com</b>. Akun Dokter/Admin: <b>dokter@cikidangmedika.com</b>. Kata sandi tidak dicantumkan "
        "di dokumen ini dan diserahkan secara terpisah. Jangan membagikan kata sandi dan selalu tekan <b>Keluar dari Akun</b> bila komputer dipakai bergantian."
    ))

    s += h2("2. Alur Harian Langkah demi Langkah")
    s.append(body("Alur pelayanan berjalan dari loket, ke ruang periksa, lalu ke kasir. Data yang diisi di satu tahap langsung terlihat di tahap berikutnya."))

    s.append(h3("2.1 Masuk ke sistem"))
    s += steps([
        "Buka alamat web sistem di Google Chrome.",
        "Pilih peran pada <b>Pilih Cepat Berdasarkan Peran</b> (Pemilik atau Dokter/Admin) agar email terisi, atau ketik email sendiri.",
        "Ketik kata sandi, lalu tekan <b>Masuk ke Sistem</b>.",
    ])
    s.append(figure(img("01-login.png"), "Gambar 1. Halaman masuk sistem.", max_height=8.5 * cm))

    s.append(h3("2.2 Loket: mencari dan mendaftarkan pasien"))
    s += steps([
        "Buka menu <b>Loket &amp; Kasir</b>. Ketik nama, No. RM, atau desa di kolom pencarian.",
        "Bila pasien sudah terdaftar, tekan <b>Daftar Kunjungan</b> pada baris pasien. Tanggal lahir ikut tampil untuk membedakan pasien bernama sama.",
        "Bila pasien belum terdaftar, isi data pasien baru. Nomor rekam medis dibuat otomatis oleh sistem.",
        "Pada formulir kunjungan, pilih <b>Dokter Pemeriksa</b>, <b>Kategori Pasien</b> (BPJS atau Umum), tulis keluhan utama, dan pilih "
        "<b>Rujukan Bidan</b> bila pasien dirujuk bidan.",
        "Tekan <b>Daftarkan &amp; Ambil Antrean</b>. Pasien masuk antrean ruang periksa.",
    ])
    s.append(figure(img("02-loket-cari-pasien.png"), "Gambar 2. Hasil pencarian pasien di Loket.", max_height=7 * cm))
    s.append(figure(img("03-loket-daftar-kunjungan.png"), "Gambar 3. Formulir Pendaftaran Kunjungan Poli.", max_height=10.5 * cm))

    s.append(h3("2.3 Dokter: pemeriksaan pasien"))
    s += steps([
        "Buka menu <b>Pemeriksaan Dokter</b>. Pada <b>Antrean Ruang Periksa</b>, tekan <b>Panggil &amp; Periksa</b> pada pasien yang akan diperiksa.",
        "Isi tanda vital dan anamnesa. Pilih diagnosa dari tombol diagnosa cepat atau cari kode ICD-10.",
        "Isi resep obat, tindakan, dan biaya bila ada.",
        "Bila perlu, gunakan tombol <b>Surat Sakit</b>, <b>Rujukan</b>, <b>Register TBC</b>, <b>Sirkumsisi</b>, atau <b>Paket Terapi</b>.",
        "Tekan <b>Selesai Periksa &amp; Kirim Kasir</b>. <b>Simpan Draft</b> dipakai bila pemeriksaan belum selesai.",
        "Pada langkah terakhir, pilih <b>Kategori Program</b> (Umum, ANC, PTM, KB, atau 3 Eliminasi) lalu tekan <b>Simpan Kategori</b>.",
    ])
    s.append(figure(img("04-dokter-pemeriksaan.png"), "Gambar 4. Layar Pemeriksaan Dokter dengan antrean di sisi kiri.", max_height=10.5 * cm))
    s.append(figure(img("05-dokter-kategori-anc.png"), "Gambar 5. Memilih dan menyimpan Kategori Program.", max_height=5.5 * cm))

    s.append(h3("2.4 Kasir: pembayaran lunas dan kuitansi"))
    s += steps([
        "Di menu <b>Loket &amp; Kasir</b>, bagian <b>Workstation Kasir &amp; Farmasi</b>, pilih pasien pada <b>Antrean Pasien Siap Bayar</b>.",
        "Periksa resep dan rincian tagihan. Untuk pasien BPJS, jasa pemeriksaan otomatis Rp 0; biaya tambahan tetap dapat ditagih.",
        "Pilih cara bayar <b>Tunai (Cash)</b> atau <b>Transfer (TF)</b>, lalu pilih <b>Lunas</b>.",
        "Isi <b>Uang Diterima</b> atau tekan tombol nominal cepat. Sistem menghitung kembalian.",
        "Tekan <b>Konfirmasi Bayar &amp; Cetak Kuitansi</b>, lalu cetak kuitansi untuk pasien. Serahkan obat setelah pembayaran selesai.",
    ])
    s.append(figure(img("07-kasir-bayar-lunas.png"), "Gambar 6. Workstation Kasir: pembayaran tunai lunas.", max_height=10.5 * cm))
    s.append(figure(img("08-kuitansi.png"), "Gambar 7. Kuitansi Pembayaran Pasien.", max_height=10 * cm))

    s.append(h3("2.5 Kasir: tunggakan, bayar sebagian, dan pelunasan"))
    s.append(body(
        "Pasien yang belum membayar pada hari periksanya tetap tampil di antrean kasir dengan tanda kuning <b>Tunggakan</b> dan tanggal periksanya. "
        "Uang selalu dicatat pada <b>tanggal uang diterima</b>."
    ))
    s += steps([
        "Bila pasien hanya membayar sebagian, pilih <b>Piutang</b> dan isi uang yang diterima. Sistem menampilkan <b>Sisa Piutang</b>.",
        "Saat pasien kembali, pilih pasien bertanda Tunggakan. Panel kasir menampilkan <b>Sudah dibayar</b> beserta tanggalnya, <b>Sisa piutang</b>, dan <b>Harus dibayar sekarang</b>.",
        "Pembayaran lanjutan harus <b>melunasi seluruh sisa tagihan</b>. Pilih cara bayar, lalu tekan <b>Konfirmasi Pembayaran &amp; Cetak Kuitansi</b>.",
        "Kuitansi pelunasan mencantumkan Tanggal Periksa, Tanggal Bayar, dan Tanggal Pelunasan.",
    ])
    s.append(figure(img("09-kasir-tunggakan-piutang.png"), "Gambar 8. Pembayaran sebagian (Piutang): uang diterima Rp 80.000, sisa Rp 120.000.", max_height=10.5 * cm))
    s.append(figure(img("10-kasir-sisa-piutang.png"), "Gambar 9. Pasien kembali untuk melunasi sisa piutang.", max_height=10.5 * cm))
    s.append(figure(img("11-kuitansi-pelunasan.png"), "Gambar 10. Kuitansi pelunasan dengan tiga tanggal.", max_height=9.5 * cm))

    s.append(h3("2.6 Buku Kas: kas masuk, kas keluar, setoran, dan Saldo Awal"))
    s += steps([
        "Buka menu <b>Buku Kas Operasional</b>. Pilih bulan dan tahun pada <b>Periode Laporan</b>.",
        "Tekan <b>Kas Masuk</b> untuk mencatat pemasukan di luar kasir, atau <b>Kas Keluar</b> untuk pengeluaran. Kategori pengeluaran "
        "dikelompokkan menjadi Klinik dan Non Klinik. Tanggal tidak dapat diisi melebihi hari ini.",
        "Tekan <b>Catat Setor Tunai</b> saat uang dari laci disetor ke bank atau ke pemilik. Setoran tidak dihitung sebagai pengeluaran.",
        "Khusus Pemilik: pada awal bulan, hitung uang di laci, lalu tekan <b>Ubah Saldo Awal</b> (atau <b>Isi Saldo Awal</b>), isi nominalnya, dan simpan.",
        "Periksa kartu <b>Sisa Fisik di Laci Kasir</b> dan cocokkan dengan uang di laci.",
    ])
    s.append(figure(img("12b-buku-kas-ringkasan.png"), "Gambar 11. Buku Kas Operasional: tombol Kas Masuk/Kas Keluar dan ringkasan bulan.", max_height=10.5 * cm))
    s.append(figure(img("13-saldo-awal-modal.png"), "Gambar 12. Formulir Saldo Awal Laci (khusus Pemilik).", max_height=9.5 * cm))
    s.append(boxed(
        "<b>Rumus sisa laci:</b> Saldo Awal + Tunai Masuk Laci - Pengeluaran Tunai Laci - Setoran ke Pemilik/Bank. "
        "Bila bulan ini belum diisi, Saldo Awal otomatis melanjutkan sisa laci bulan sebelumnya. Pembayaran transfer tidak masuk laci."
    ))

    s.append(h3("2.7 Laporan dan Ekspor Excel"))
    s += steps([
        "Buka menu <b>Laporan &amp; Ekspor Excel</b>. Pilih <b>Satu Tanggal</b> atau <b>Rentang Tanggal</b>, atau tombol cepat Bulan Ini, Bulan Lalu, Tahun berjalan, Semua Data.",
        "Atur filter Jenis Pasien, Dokter Pemeriksa, dan Kategori Program bila perlu, lalu tekan <b>Terapkan Filter</b>.",
        "Pilih tab laporan: Rekap Kunjungan, 10 Besar Penyakit, Pemantauan Rujukan Bidan, Laporan Puskesmas, Arus Kas Operasional, atau Komisi Rujukan Bidan.",
        "Tekan <b>Unduh Tab Ini (.xlsx)</b> untuk tab yang sedang dibuka, atau <b>Rekap Lengkap (5 Sheet)</b> untuk satu file berisi Rekapitulasi "
        "Kunjungan, Penerimaan Kasir, Morbiditas ICD-10, Arus Kas Operasional, dan Rekap Pengeluaran.",
    ])
    s.append(figure(img("14-laporan-ringkasan.png"), "Gambar 13. Pusat Laporan dan filter periode.", max_height=10.5 * cm))
    s.append(figure(img("15-laporan-rekap-pengeluaran.png"), "Gambar 14. Rekap Pengeluaran Bulanan: Klinik dan Non Klinik.", max_height=4.5 * cm))

    s.append(h3("2.8 Dashboard (khusus Pemilik)"))
    s.append(body(
        "Dashboard terbuka pada <b>Bulan Ini</b>. Periode dapat diganti ke Bulan Lalu, tahun berjalan, Semua Periode, atau Kustom. Kartu atas menampilkan "
        "Total Kunjungan, Pendapatan Kasir, Kapitasi BPJS, Total Pengeluaran (dengan rincian Klinik dan Non Klinik), dan Saldo Kas Bersih. "
        "Kotak <b>Perhatian Klinis</b> menunjukkan pasien program yang perlu ditindaklanjuti; tekan <b>Tindak Lanjut</b> untuk membukanya. "
        "Bagian <b>Likuiditas Kas Riil &amp; Bank</b> memisahkan uang di laci dan uang di rekening."
    ))
    s.append(figure(img("18-dashboard.png"), "Gambar 15. Dashboard Eksekutif Klinik, periode Bulan Ini.", max_height=10.5 * cm))

    s += h2("3. Fitur Lain (Ringkas)")
    s += bullets([
        "<b>Batalkan antrean:</b> tombol <b>Batalkan</b> pada kartu antrean dipakai bila pasien pulang sebelum diperiksa. Kunjungan yang sudah menerima uang tidak dapat dibatalkan.",
        "<b>Pasien bebas biaya:</b> di kasir, aktifkan <b>Opsi Bebas Biaya (Free 100%)</b> dan pilih alasannya, misalnya kontrol pasca tindakan atau keluarga dokter/staf.",
        "<b>Paket Terapi:</b> Pemilik mengatur paket di menu Paket Terapi. Dokter atau kasir menerapkannya dengan tombol <b>Paket Terapi</b> atau <b>Terapkan Paket Terapi</b>.",
        "<b>Surat Keterangan Sakit dan Rujukan:</b> dibuat dari tombol <b>Surat Sakit</b> dan <b>Rujukan</b> di layar Pemeriksaan Dokter, lalu dicetak.",
        "<b>Rujukan bidan:</b> dipilih saat pendaftaran. Rekap per bidan dan komisi tersedia di tab Pemantauan Rujukan Bidan dan Komisi Rujukan Bidan pada Laporan.",
        "<b>Program Khusus Medis:</b> berisi Kartu Kendali TBC, Sirkumsisi &amp; Foto, Agenda Observasi, dan Program Kesehatan. Tiga yang pertama terbuka pada "
        "tampilan <b>Pasien Aktif</b>; tekan <b>Semua Riwayat</b> untuk melihat seluruh data.",
        "<b>Foto sirkumsisi:</b> foto luka dikecilkan otomatis sebelum disimpan agar hemat kuota dan ruang penyimpanan.",
        "<b>Laporan Puskesmas:</b> register program kesehatan dapat diunduh sebagai Excel dari tab Laporan Puskesmas.",
    ])

    s += h2("4. Aturan Penting yang Perlu Diketahui")
    s += bullets([
        "<b>Pasien BPJS:</b> jasa pemeriksaan Rp 0 karena dibayar lewat kapitasi. Biaya tambahan di luar tanggungan tetap ditagih di kasir.",
        "<b>Tanggal uang:</b> uang dihitung pada tanggal diterima. Jumlah kunjungan, diagnosa, dan register program dihitung pada tanggal periksa.",
        "<b>Pelunasan:</b> setelah pembayaran pertama, pembayaran berikutnya harus melunasi seluruh sisa tagihan.",
        "<b>Pendapatan Kasir dan Tunai Masuk Laci:</b> Pendapatan Kasir mencakup tunai dan transfer. Tunai Masuk Laci hanya tunai, sehingga angkanya lebih kecil.",
        "<b>Pengeluaran:</b> Pengeluaran Non Klinik dihitung Non Klinik; kategori pengeluaran lain, termasuk Honor &amp; Transport, dihitung Klinik. Setoran bukan pengeluaran.",
        "<b>Pasien aktif Program Khusus:</b> TBC berstatus Dalam Pengobatan atau Mangkir; sirkumsisi dalam 14 hari terakhir; agenda observasi berstatus Menunggu atau Mangkir. "
        "Pasien TBC diberi status Mangkir bila tidak kontrol lebih dari 7 hari dari jadwal.",
        "<b>Pasien ganda:</b> cari pasien terlebih dahulu sebelum membuat data baru, agar satu pasien hanya memiliki satu nomor rekam medis.",
    ])

    s += h2("5. Tanya Jawab")
    qna = [
        ("Apakah sistem dapat dibuka dari HP?", "Ya. Tampilan menyesuaikan ukuran layar HP, tablet, dan komputer. Di HP, menu dibuka dengan tombol menu (ikon garis tiga) di bagian atas."),
        ("Pasien belum membayar dan sudah pulang. Apa yang dilakukan?", "Biarkan statusnya. Pasien tetap tampil di antrean kasir dengan tanda Tunggakan sampai dibayar, dan uangnya tercatat pada hari pembayaran."),
        ("Sisa laci di Buku Kas minus. Apa sebabnya?", "Biasanya Saldo Awal bulan itu belum diisi, sehingga setoran dari uang bulan sebelumnya mengurangi laci bulan ini. Pemilik dapat mengisi Saldo Awal hasil hitung laci."),
        ("Mengapa akun Dokter/Admin tidak melihat Dashboard?", "Ringkasan keuangan klinik hanya untuk Pemilik. Akun Dokter/Admin tetap dapat menjalankan pendaftaran, pemeriksaan, kasir, dan pencatatan kas hari ini."),
        ("Apakah sistem tetap jalan bila internet terputus?", "Tidak. Menyimpan data dan mencetak kuitansi membutuhkan internet. Bila jaringan klinik terputus, gunakan hotspot HP sementara."),
        ("Bagaimana melaporkan kendala?", "Ambil screenshot layar, catat jam kejadian dan langkah yang dilakukan, lalu kirim ke pengembang. Jangan mengirim kata sandi."),
    ]
    for q, a in qna:
        s.append(Paragraph(f"<b>{q}</b>", S["body"]))
        s.append(Paragraph(a, S["bullet"]))
    return s


if __name__ == "__main__":
    build(story(), OUT_PATH, TITLE, RUNNING, copies=[DOWNLOADS])
